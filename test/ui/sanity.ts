/**
 * Headless-browser UI sanity check.
 *
 * Serves the repository over a local HTTP server, loads index.html in a
 * headless Chromium (WebGL via SwiftShader), and verifies that the app still
 * boots and behaves correctly:
 *
 *   1. The React app mounts and the main UI regions render.
 *   2. The three.js WebGL canvas is created, its context survives, and the
 *      world actually draws something (pixels are not uniform).
 *   3. The code editor can be toggled open/closed.
 *   4. The Console tab runs a command end-to-end (main thread → worker →
 *      React re-render), proving the worker pipeline is alive.
 *   5. The Script tab (MUI buttons / tabs) still reacts to clicks.
 *   6. No uncaught page errors, no console errors, no failed asset loads.
 *
 * This is deliberately a small sanity check, not a comprehensive test suite.
 *
 * Usage:  yarn build && yarn test:ui
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const BUILD = path.join(ROOT, 'build');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.glsl': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

function startServer(root: string): Promise<number> {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const filePath = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }

      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.removeListener('error', reject);
      resolve(typeof address === 'object' && address !== null ? address.port : 0);
    });
  });
}

interface PixelStats {
  ok: boolean;
  reason?: string;
  min?: number;
  max?: number;
  nonWhite?: number;
  total?: number;
}

/** Read pixels from the live WebGL canvas (default framebuffer). */
function readCanvasPixels(page: Page): Promise<PixelStats> {
  return page.evaluate(() => new Promise<PixelStats>(resolve => {
    const canvas = document.querySelector<HTMLCanvasElement>('.viewPort canvas');
    if (!canvas) return resolve({ ok: false, reason: 'no canvas in .viewPort' });

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return resolve({ ok: false, reason: 'no WebGL context on canvas' });
    if (gl.isContextLost()) return resolve({ ok: false, reason: 'WebGL context lost' });

    // The renderer is created with preserveDrawingBuffer: false, so the
    // back buffer is cleared after compositing. Read inside a
    // requestAnimationFrame callback — the render loop's callback (registered
    // at boot) has already run in this frame, so the buffer still holds the
    // current frame.
    requestAnimationFrame(() => {
      const width = canvas.width || 1;
      const height = canvas.height || 1;
      const stride = 4;
      const buf = new Uint8Array(width * height * stride);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buf);

      let min = 255;
      let max = 0;
      let nonWhite = 0;

      for (let i = 0; i < buf.length; i += stride) {
        const r = buf[i], g = buf[i + 1], b = buf[i + 2];
        if (r < 250 || g < 250 || b < 250) nonWhite += 1;
        const lo = Math.min(r, g, b);
        const hi = Math.max(r, g, b);
        if (lo < min) min = lo;
        if (hi > max) max = hi;
      }

      resolve({ ok: true, min, max, nonWhite, total: width * height });
    });
  }));
}

async function main() {
  // The sanity check runs against the built app, like a real browser would.
  for (const asset of ['app.js', 'worker.js', 'style.js']) {
    if (!fs.existsSync(path.join(BUILD, asset))) {
      console.error(`\nMissing build/${asset} — run \`yarn build\` before \`yarn test:ui\`.`);
      process.exit(1);
    }
  }

  const port = await startServer(ROOT);
  const url = `http://127.0.0.1:${port}/index.html`;
  console.log(`Serving ${ROOT} at ${url}`);

  const browser: Browser = await chromium.launch({
    headless: true,
    args: [
      // Chrome 137+ gates software WebGL (SwiftShader) behind this flag.
      '--enable-unsafe-swiftshader',
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const notFound: string[] = [];

  page.on('pageerror', err => pageErrors.push(String(err)));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', req => failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText ?? 'failed'})`));
  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
      notFound.push(`${res.status()} ${res.url()}`);
    }
  });

  const screenshotOnFailure = async (label: string) => {
    const file = path.join(os.tmpdir(), `web-blocks-ui-sanity-${label}.png`);
    try {
      await page.screenshot({ path: file });
      console.error(`  Screenshot: ${file}`);
    } catch {
      // Screenshotting a failed page is best-effort.
    }
  };

  let exitCode = 0;
  let step = 0;

  const check = async (name: string, fn: () => Promise<void>) => {
    step += 1;
    try {
      await fn();
      console.log(`  ${step}. ok — ${name}`);
    } catch (err) {
      exitCode = 1;
      console.error(`  ${step}. FAIL — ${name}`);
      console.error(`     ${(err as Error).message}`);
      await screenshotOnFailure(`${step}-${name.replace(/\W+/g, '-')}`);
      throw err;
    }
  };

  const expect = (condition: boolean, message: string): void => {
    if (!condition) throw new Error(message);
  };

  try {
    console.log('Loading page…');
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });

    await check('React app mounts and main UI regions render', async () => {
      await page.waitForSelector('.app', { state: 'visible', timeout: 15000 });
      for (const selector of ['.viewPort', '.toolBox', '.helpBar', '.boundScriptBar', '.codeButton']) {
        const visible = await page.locator(selector).first().isVisible();
        expect(visible, `missing or invisible: ${selector}`);
      }

      // The toolbox lists only render once game.init() has resolved (worker
      // started, shaders loaded, world info received), so waiting for them
      // doubles as a check that the whole boot sequence completed.
      await page.waitForSelector('.toolBox ul.small li', { state: 'visible', timeout: 20000 });

      const toolItems = await page.locator('.toolBox ul.small li').count();
      expect(toolItems > 0, 'no tool/block/move items rendered in the toolbox');
    });

    await check('WebGL canvas is created and the world renders', async () => {
      await page.waitForSelector('.viewPort canvas', { state: 'attached', timeout: 15000 });

      // Give the worker time to build the world and culling time to expose
      // partitions near the player (every 20 frames).
      await page.waitForTimeout(5000);

      const stats = await readCanvasPixels(page);
      expect(stats.ok, `WebGL check failed: ${stats.reason ?? 'unknown'}`);

      const coverage = (stats.nonWhite ?? 0) / (stats.total ?? 1);
      console.log(`     canvas ${Math.round(Math.sqrt(stats.total ?? 1))}² px, pixel range ${stats.min}–${stats.max}, non-white ${(coverage * 100).toFixed(1)}%`);
      expect((stats.max ?? 0) > (stats.min ?? 255), 'canvas is a single uniform colour (nothing drawn)');
      expect(coverage > 0.02, `only ${(coverage * 100).toFixed(1)}% of the canvas is non-white — the world does not appear to be rendering`);
    });

    await check('code editor toggles open with < Code >', async () => {
      await page.locator('.codeButton').click();
      await page.waitForSelector('.codeEditor.show', { state: 'visible', timeout: 5000 });

      const visible = await page.locator('.codeEditor').first().isVisible();
      expect(visible, '.codeEditor is not visible after clicking < Code >');
    });

    await check('console runs a command through the worker end-to-end', async () => {
      const textarea = page.locator('.codeView.console textarea').first();
      await textarea.waitFor({ state: 'visible', timeout: 5000 });

      await textarea.fill('hi');
      await textarea.press('Enter');

      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('.codeView.console li.answer'))
          .some(li => (li.textContent ?? '').includes('Hi there!')),
        undefined,
        { timeout: 10000 },
      );
    });

    await check('Script tab and its toolbar buttons react to clicks', async () => {
      const scriptTab = page.locator('.codeEditor').getByText('Script', { exact: true }).first();
      await scriptTab.waitFor({ state: 'visible', timeout: 5000 });
      await scriptTab.click();

      const scriptTextarea = page.locator('.codeView.script textarea').first();
      await scriptTextarea.waitFor({ state: 'visible', timeout: 5000 });

      for (const label of ['New', 'Open...', 'Save', 'Save As...', 'Run ▶']) {
        const button = page.getByRole('button', { name: label }).first();
        expect(await button.isVisible(), `button "${label}" not visible in the Script tab`);
      }

      await page.getByRole('button', { name: 'New' }).first().click();
      await page.waitForFunction(
        () => (document.querySelector('.codeView.script h3')?.textContent ?? '').includes('[New Script]'),
        undefined,
        { timeout: 5000 },
      );
    });

    await check('code editor toggles closed with ESC', async () => {
      await page.keyboard.press('Escape');
      // The editor div gets the .hide class (display: none), so wait for it
      // to be attached rather than visible.
      await page.waitForSelector('.codeEditor.hide', { state: 'attached', timeout: 5000 });
    });

    await check('no uncaught page errors', async () => {
      expect(pageErrors.length === 0, `uncaught errors:\n${pageErrors.join('\n')}`);
    });

    await check('no console errors', async () => {
      expect(consoleErrors.length === 0, `console errors:\n${consoleErrors.join('\n')}`);
    });

    await check('no failed or 4xx/5xx requests', async () => {
      expect(failedRequests.length === 0, `failed requests:\n${failedRequests.join('\n')}`);
      expect(notFound.length === 0, `error responses:\n${notFound.join('\n')}`);
    });
  } catch (err) {
    exitCode = 1;
    console.error(`\nSanity check stopped after step ${step}: ${(err as Error).message}`);
    if (pageErrors.length) console.error(`Uncaught page errors:\n${pageErrors.join('\n')}`);
    if (consoleErrors.length) console.error(`Console errors:\n${consoleErrors.join('\n')}`);
    if (failedRequests.length) console.error(`Failed requests:\n${failedRequests.join('\n')}`);
    if (notFound.length) console.error(`Error responses:\n${notFound.join('\n')}`);
  } finally {
    await browser.close();
  }

  // Give the server a tick to flush, then close it.
  await new Promise<void>(resolve => http.get(`http://127.0.0.1:${port}/`, res => {
    res.resume();
    res.on('end', resolve);
  }).on('error', resolve));

  console.log(exitCode === 0
    ? '\nUI sanity check passed.'
    : '\nUI sanity check FAILED.');
  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
