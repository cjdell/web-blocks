/**
 * Headless-browser UI sanity check (vitest suite).
 *
 * Serves the repository over a local HTTP server, loads index.html in a
 * headless Chromium (WebGL via SwiftShader), and verifies that the app still
 * boots and behaves correctly. Every check is a named vitest test, so
 * `yarn test` (or `yarn test:ui` for just this file) shows a visible
 * per-check pass/fail list:
 *
 *   1. The React app mounts and the main UI regions render.
 *   2. The three.js WebGL canvas is created, its context survives, and the
 *      world actually draws something (pixels are not uniform).
 *   3. The code editor can be toggled open/closed.
 *   4. The Console tab runs a command end-to-end (main thread → worker →
 *      React re-render), proving the worker pipeline is alive.
 *   5. The Script tab (MUI buttons / tabs) still reacts to clicks.
 *   6. Saving a script and reloading remounts the app cleanly (the
 *      localStorage round-trip must restore the script's Date).
 *   7. No uncaught page errors, no console errors, no failed asset loads.
 *
 * This is deliberately a small sanity check, not a comprehensive test suite.
 * The checks are sequential and stateful (each builds on the previous
 * step's app state), so they run in order within this single file.
 *
 * Requires the built app: run `yarn build` first. If Chromium is missing,
 * install it with `yarn playwright install chromium`.
 *
 * Usage:  yarn test   (or yarn test:ui for just this file)
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, type TestContext } from 'vitest';
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

interface RunningServer {
  server: http.Server;
  port: number;
}

function startServer(root: string): Promise<RunningServer> {
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

      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.removeListener('error', reject);
      resolve({
        server,
        port: typeof address === 'object' && address !== null ? address.port : 0,
      });
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
  return page.evaluate(
    () =>
      new Promise<PixelStats>((resolve) => {
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
            const r = buf[i],
              g = buf[i + 1],
              b = buf[i + 2];
            if (r < 250 || g < 250 || b < 250) nonWhite += 1;
            const lo = Math.min(r, g, b);
            const hi = Math.max(r, g, b);
            if (lo < min) min = lo;
            if (hi > max) max = hi;
          }

          resolve({ ok: true, min, max, nonWhite, total: width * height });
        });
      }),
  );
}

describe('UI sanity (headless browser)', () => {
  // Definite-assignment assertions: each handle is created in beforeAll and
  // torn down in afterAll; TS cannot see across the two closures.
  let server!: http.Server;
  let port = 0;
  let browser!: Browser;
  let page!: Page;

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const notFound: string[] = [];

  /** Screenshot the live page so a failure has visual evidence. */
  const screenshotOnFailure = async (label: string): Promise<void> => {
    const file = path.join(os.tmpdir(), `web-blocks-ui-sanity-${label}.png`);
    try {
      await page.screenshot({ path: file });
      console.error(`  Screenshot: ${file}`);
    } catch {
      // Screenshotting a failed page is best-effort.
    }
  };

  /**
   * Register one sanity check as a named test. A screenshot of the live page
   * is captured when the check fails.
   */
  const uiTest = (name: string, fn: (context: TestContext) => Promise<void>): void => {
    it(name, async (context) => {
      context.onTestFailed(async () => {
        await screenshotOnFailure(name.replace(/\W+/g, '-'));
      });
      await fn(context);
    });
  };

  beforeAll(async () => {
    // The sanity check runs against the built app, like a real browser would.
    for (const asset of ['app.js', 'worker.js', 'style.js']) {
      if (!fs.existsSync(path.join(BUILD, asset))) {
        throw new Error(`Missing build/${asset} — run \`yarn build\` before \`yarn test\`.`);
      }
    }

    ({ server, port } = await startServer(ROOT));
    console.log(`Serving ${ROOT} at http://127.0.0.1:${port}/index.html`);

    browser = await chromium.launch({
      headless: true,
      args: [
        // Chrome 137+ gates software WebGL (SwiftShader) behind this flag.
        '--enable-unsafe-swiftshader',
      ],
    });

    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', (req) =>
      failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText ?? 'failed'})`),
    );
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
        notFound.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 30000 });
  });

  afterAll(async () => {
    try {
      await browser.close();

      // Give the server a tick to flush, then close it.
      await new Promise<void>((resolve) =>
        http
          .get(`http://127.0.0.1:${port}/`, (res) => {
            res.resume();
            res.on('end', resolve);
          })
          .on('error', resolve),
      );
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        // Don't wait for keep-alive sockets to drain on their own.
        server.closeAllConnections();
      });
    } catch {
      // Teardown is best effort: if beforeAll failed partway, some handles
      // were never created. The setup error is the one that matters.
    }
  });

  uiTest('React app mounts and main UI regions render', async () => {
    await page.waitForSelector('.app', { state: 'visible', timeout: 15000 });
    for (const selector of [
      '.viewPort',
      '.toolBox',
      '.helpBar',
      '.boundScriptBar',
      '.codeButton',
    ]) {
      const visible = await page.locator(selector).first().isVisible();
      expect(visible, `missing or invisible: ${selector}`).toBe(true);
    }

    // The toolbox lists only render once game.init() has resolved (worker
    // started, shaders loaded, world info received), so waiting for them
    // doubles as a check that the whole boot sequence completed.
    await page.waitForSelector('.toolBox ul.small li', { state: 'visible', timeout: 20000 });

    const toolItems = await page.locator('.toolBox ul.small li').count();
    expect(toolItems > 0, 'no tool/block/move items rendered in the toolbox').toBe(true);
  });

  uiTest('WebGL canvas is created and the world renders', async () => {
    await page.waitForSelector('.viewPort canvas', { state: 'attached', timeout: 15000 });

    // Give the worker time to build the world and culling time to expose
    // partitions near the player (every 20 frames).
    await page.waitForTimeout(5000);

    const stats = await readCanvasPixels(page);
    expect(stats.ok, `WebGL check failed: ${stats.reason ?? 'unknown'}`).toBe(true);

    const coverage = (stats.nonWhite ?? 0) / (stats.total ?? 1);
    console.log(
      `canvas ${Math.round(Math.sqrt(stats.total ?? 1))}² px, pixel range ${stats.min}–${stats.max}, non-white ${(coverage * 100).toFixed(1)}%`,
    );
    expect(
      (stats.max ?? 0) > (stats.min ?? 255),
      'canvas is a single uniform colour (nothing drawn)',
    ).toBe(true);
    expect(
      coverage > 0.02,
      `only ${(coverage * 100).toFixed(1)}% of the canvas is non-white — the world does not appear to be rendering`,
    ).toBe(true);
  });

  uiTest('code editor toggles open with < Code >', async () => {
    await page.locator('.codeButton').click();
    await page.waitForSelector('.codeEditor.show', { state: 'visible', timeout: 5000 });

    const visible = await page.locator('.codeEditor').first().isVisible();
    expect(visible, '.codeEditor is not visible after clicking < Code >').toBe(true);
  });

  uiTest('console runs a command through the worker end-to-end', async () => {
    const textarea = page.locator('.codeView.console textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 5000 });

    await textarea.fill('hi');
    await textarea.press('Enter');

    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.codeView.console li.answer')).some((li) =>
          (li.textContent ?? '').includes('Hi there!'),
        ),
      undefined,
      { timeout: 10000 },
    );
  });

  uiTest('Script tab and its toolbar buttons react to clicks', async () => {
    const scriptTab = page.locator('.codeEditor').getByText('Script', { exact: true }).first();
    await scriptTab.waitFor({ state: 'visible', timeout: 5000 });
    await scriptTab.click();

    const scriptTextarea = page.locator('.codeView.script textarea').first();
    await scriptTextarea.waitFor({ state: 'visible', timeout: 5000 });

    for (const label of ['New', 'Open...', 'Save', 'Save As...', 'Run ▶']) {
      const button = page.getByRole('button', { name: label }).first();
      expect(await button.isVisible(), `button "${label}" not visible in the Script tab`).toBe(
        true,
      );
    }

    await page.getByRole('button', { name: 'New' }).first().click();
    await page.waitForFunction(
      () =>
        (document.querySelector('.codeView.script h3')?.textContent ?? '').includes('[New Script]'),
      undefined,
      { timeout: 5000 },
    );
  });

  uiTest('Save As dialog saves a script name', async () => {
    await page.getByRole('button', { name: 'Save As...' }).first().click();

    const dialog = page.locator('.dialog', { hasText: 'Save as...' });
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    const nameInput = page.locator('#saveAsNameInput');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    // The app focuses the input (and applies its initial value) in a
    // 100ms timeout; wait for that before typing.
    await page.waitForFunction(
      () => document.activeElement === document.querySelector('#saveAsNameInput'),
      undefined,
      { timeout: 2000 },
    );
    await nameInput.fill('Sanity Script');

    // Scope to the dialog: the Script toolbar also has a "Save" button
    // (and it comes first in DOM order), so the dialog's Save must be
    // addressed through the open dialog.
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await page.waitForFunction(
      () =>
        (document.querySelector('.codeView.script h3')?.textContent ?? '').includes(
          'Sanity Script',
        ),
      undefined,
      { timeout: 5000 },
    );
    expect(await dialog.isVisible(), 'Save As dialog did not close after saving').toBe(false);
  });

  uiTest('Open dialog lists the saved script and closes with Cancel', async () => {
    await page.getByRole('button', { name: 'Open...' }).first().click();

    const dialog = page.locator('.dialog', { hasText: 'Choose a script...' });
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    const listItem = dialog.locator('.listItem', { hasText: 'Sanity Script' });
    await listItem.waitFor({ state: 'visible', timeout: 5000 });

    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.waitForFunction(() => !document.querySelector('.dialog'), undefined, {
      timeout: 5000,
    });
  });

  uiTest('code editor toggles closed with ESC', async () => {
    await page.keyboard.press('Escape');
    // The editor div gets the .hide class (display: none), so wait for it
    // to be attached rather than visible.
    await page.waitForSelector('.codeEditor.hide', { state: 'attached', timeout: 5000 });
  });

  uiTest('worker→host events reach the page (position, print, update)', async () => {
    // With the code editor closed, the worker pushes events back to the
    // main thread through comlink listener proxies. Exercise all three
    // channels: player position (every tick), print (learner script), and
    // partition update (world change).
    //
    // §2.1: position events are only emitted when position or target
    // changes beyond an epsilon, so trigger a move command first.

    // 1. Register the position listener.
    await page.evaluate(() => {
      const wi = (window as any).workerInterface;
      (window as any).positionEvents = 0;
      wi.onPlayerPositionChange(() => {
        (window as any).positionEvents += 1;
      });
    });

    // 2. Move the player via the worker so the next tick emits position events.
    await page.evaluate(() => {
      const wi = (window as any).workerInterface;
      wi.move({ move: { x: 0, y: 0, z: 1 }, turn: { x: 0, y: 0 } });
    });

    // Wait for position events (the tick will process the movement).
    await page.waitForFunction(() => (window as any).positionEvents > 0, undefined, {
      timeout: 5000,
    });

    // 2. Update: count partition re-fetches, then mutate the world through
    //    a learner script and wait for the change to arrive as an event
    //    that triggers a partition update.
    await page.evaluate(() => {
      const wi = (window as any).workerInterface;
      (window as any).partitionFetches = 0;
      const original = wi.getPartition.bind(wi);
      wi.getPartition = (...args: unknown[]) => {
        (window as any).partitionFetches += 1;
        return original(...args);
      };
    });

    // The code editor is closed, so Enter toggles the in-game mini console.
    const miniInput = page.locator('.miniConsoleInput');
    await page.keyboard.press('Enter');
    await miniInput.waitFor({ state: 'visible', timeout: 5000 });

    // print() output crosses the boundary via the worker's print event.
    await miniInput.fill("print('comlink print ok')");
    await miniInput.press('Enter'); // closes the console and runs the script

    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.miniConsoleOutput li')).some((li) =>
          (li.textContent ?? '').includes('comlink print ok'),
        ),
      undefined,
      { timeout: 5000 },
    );

    // A world change must arrive as an update event, not just a response.
    // The comma expression keeps the console's expression-mode happy while
    // the setBlock call dirties the partition.
    await page.keyboard.press('Enter');
    await miniInput.fill("(setBlock(100,5,100,Stone),'set')");
    await miniInput.press('Enter');

    await page.waitForFunction(() => (window as any).partitionFetches > 0, undefined, {
      timeout: 5000,
    });
  });

  uiTest('app remounts cleanly after reload (localStorage round-trip)', async () => {
    // Saving a script persists JSON to localStorage, where the script's
    // Date becomes an ISO string. A reload re-parses it — ScriptStorage
    // must restore the Date or the sort in load() throws and the whole
    // app fails to mount. (Regression: caught via the user's browser.)
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('.toolBox ul.small li', { state: 'visible', timeout: 20000 });
  });

  uiTest('no uncaught page errors', async () => {
    expect(pageErrors.length === 0, `uncaught errors:\n${pageErrors.join('\n')}`).toBe(true);
  });

  uiTest('no console errors', async () => {
    expect(consoleErrors.length === 0, `console errors:\n${consoleErrors.join('\n')}`).toBe(true);
  });

  uiTest('no failed or 4xx/5xx requests', async () => {
    expect(failedRequests.length === 0, `failed requests:\n${failedRequests.join('\n')}`).toBe(
      true,
    );
    expect(notFound.length === 0, `error responses:\n${notFound.join('\n')}`).toBe(true);
  });
});
