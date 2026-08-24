import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The suite is small, so list every named test (including the individual
    // headless-browser sanity checks) instead of per-file summaries.
    reporters: 'verbose',

    // The headless-browser sanity tests perform real page loads and deliberate
    // waits; the in-memory world tests finish in milliseconds, so a generous
    // ceiling costs them nothing.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
