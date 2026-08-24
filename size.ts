/**
 * Post-gzip bundle budgets (P3.9).
 *
 * Webpack's built-in size warnings use raw (pre-gzip) asset sizes, which
 * say little about a three.js + React WebGL bundle (747 KiB raw is normal
 * here). The size that actually crosses the wire is post-gzip, so this
 * script gzips the production bundles and checks them against explicit
 * budgets. Run `yarn build` first, then `yarn size`; it exits non-zero if
 * any bundle is over budget.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

// Post-gzip budgets in KiB. Measured baseline 2026-08-24 (P3.9):
// app 195.1, worker 38.9, style 5.7. Each budget carries ~15–20 % headroom
// over that baseline; raise a budget deliberately and note it in
// MODERNISATION_REPORT.md §3 (P3.9).
const BUDGETS_KIB: Record<string, number> = {
  'app.js': 230,
  'worker.js': 48,
  'style.js': 12,
};

const buildDir = fileURLToPath(new URL('./build/', import.meta.url));

let failed = false;

for (const [file, budgetKib] of Object.entries(BUDGETS_KIB)) {
  const full = path.join(buildDir, file);

  if (!existsSync(full)) {
    console.error(`size: ${file} not found — run \`yarn build\` first`);
    failed = true;
    continue;
  }

  const kib = gzipSync(readFileSync(full)).length / 1024;
  const ok = kib <= budgetKib;

  console.log(
    `${ok ? 'ok  ' : 'OVER'} — ${file}: ${kib.toFixed(1)} KiB gzip (budget ${budgetKib} KiB)`,
  );

  if (!ok) failed = true;
}

if (failed) {
  console.error(
    'size: bundle(s) exceed the post-gzip budget (see MODERNISATION_REPORT.md §3, P3.9)',
  );
  process.exit(1);
}
