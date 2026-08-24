# Web Blocks — Modernisation Report

_A surface-level modernisation pass was completed on 2026‑08‑24. This document
records what changed, what was deliberately left alone, and a prioritised plan
for the deeper work that remains._

---

## 1. What this pass changed (surface-level)

All changes are non-breaking: `yarn build`, `yarn typecheck`, `yarn lint`, and
`yarn test` all pass cleanly after the pass.

### Tooling & configuration
- **`tsconfig.json`** — target bumped `es2015 → es2022`; added
  `moduleResolution: "bundler"` and `skipLibCheck`; removed legacy keys
  (`compileOnSave`, `declaration`, `removeComments`, `noLib`,
  `preserveConstEnums`, `filesGlob`, `bower_components` exclude).
- **`webpack.config.ts`** — added explicit `mode` (production default,
  development via `NODE_ENV`), `devtool: "source-map"`, and `output.clean`.
  The build now emits `.map` files.
- **`package.json`** — added `engines: node >= 20`; new scripts
  (`typecheck`, `lint`, `profile`); removed dead dependencies
  (`es6-promise`, `whatwg-fetch`, `react-tap-event-plugin`, and four
  `react-addons-*` packages that nothing imported); replaced
  `ts-node` with `tsx` (the old `mocha --require ts-node/register` script was
  broken — `ts-node` was never even a declared dependency); bumped
  `chai` `3 → 4`; added `eslint`, `@eslint/js`, `typescript-eslint`,
  `globals`, `http-server`, `mocha`.
- **Linting** — removed the long-defunct **tslint** config and added an
  ESLint 9 flat config (`eslint.config.js`) using `typescript-eslint`.
  Lint went from unconfigured to green; vendored 2015-era code
  (`lib/`, `typings/`) and learner-facing `samples/` are excluded, and a few
  legacy rules (`no-empty-object-type`, `no-unsafe-function-type`,
  `triple-slash-reference`) are deliberately disabled with comments for the
  parts of the codebase that still rely on 2016 patterns.
- **Type foundation** — removed the 2015 `typings`/`typings.json` toolchain
  artifacts. In particular, the stale **2015 `node` global typings**
  (`typings/globals/node/index.d.ts`) were deleted: they collided with the
  modern `@types/node` already in `devDependencies` and were the reason a
  bare `tsc --noEmit` produced ~300 duplicate-identifier errors even though
  the webpack build (which only type-checks bundled files) succeeded.
- **`index.html`** — `lang=""` → `lang="en"`, added a viewport meta tag,
  moved scripts to the end of `<body>`, dropped the redundant `'use strict'`
  and `var`.
- **`.gitignore`** — dropped the broad `*.js` / `!samples/*.js` negation hack
  (build output now lives in `build/`, which is already ignored).

### Source (mechanical, behaviour-preserving)
- Converted legacy `<Type>expr` type assertions to `expr as Type` throughout
  `app/`, `worker/`.
- Replaced the last `var` declarations with `const` (ESLint `no-var` /
  `prefer-const`, plus auto-fix).
- Modernised the deprecated `document.createEvent('TextEvent')` /
  `initTextEvent` sequence in `DesktopViewPoint.ts` to `new InputEvent(...)`.
- Removed dead code: the unused `detectmob` + Cardboard platform branch in
  `App.ts` (Cardboard is disabled), unused imports/variables, an unused
  duplicate `PartitionSnapshot(s)` interface, and the unused `cliServer`
  wiring in `GeometryWorker.ts`.
- Unused function parameters were underscore-prefixed rather than deleted
  (several are interface/abstract-method signatures that must keep arity).
- Deleted two vendored files that nothing imports: `lib/three.v71.js`
  (808 KB) and `lib/underscore.js` (52 KB).
- Replaced `require('../lib/…')` calls in `CardboardPlatform.ts` with ES
  `import` side-effect imports.

---

## 2. What was deliberately NOT changed

These are the parts that need a real migration, not a surface pass. Each is
covered in the plan below.

| Area | Current | Why it stays for now |
|------|---------|----------------------|
| `react` / `react-dom` | 15.3.1 (2016) | Upgrading is a breaking change (see P1). |
| `three` | 0.81.0 (2016) | ~100 major versions behind; large API churn (see P1). |
| `material-ui` | 0.15.4 (pre-1.0, 2016) | Replaced entirely by `@mui/material`; different API (see P1). |
| `underscore` | 1.8.3 | Still imported in ~7 files; removal is a small but real refactor (see P2). |
| `typings/globals/*` (react, three, material-ui, chai, mocha, underscore) | 2015 DefinitelyTyped snapshot | Only the `node` one was deleted (it was actively broken). The rest still provide the *only* type declarations for the old packages and should go away **together with** the dependency upgrades, replaced by real `@types/*` or the packages' own types. |
| `common/WorldInfo.ts` `namespace Common` pattern | legacy | Converting to ES module exports touches ~20 import sites (see P2). |
| `worker/` `Object` / `Function` typing | untyped protocol | Needs a deliberate typing effort (see P2). |
| Google Cardboard support | disabled | Non-functional; needs a product decision (see P3). |

---

## 3. Suggested next steps (prioritised)

### P1 — Upgrade the 2016 runtime dependencies (biggest value, biggest effort)

These are the three packages that dominate both the bundle and the risk.
Do them as separate, independently-reviewable PRs, in this order.

1. **React 15 → 19.** Mechanical but wide. Key breaking changes to plan for:
   - `ReactDOM.render` → `createRoot` (React 18+).
   - `React.PropTypes` and `childContextTypes`/`getChildContext` are gone —
     `ui/index.tsx` uses both (`static childContextTypes`,
     `getChildContext`). Replace the MUI theme context with the modern
     `<ThemeProvider>` (below) and drop `getChildContext` entirely.
   - String refs (`ref="viewPort"`, `this.refs.*`) → callback refs.
     `ui/CodeEditor.tsx` and `ui/index.tsx` rely on string refs heavily.
   - `react-dom` 15 → 19 in lockstep.
   - Add `@types/react@19` / `@types/react-dom@19` and delete
     `typings/globals/react*`.

2. **`material-ui@0.15` → `@mui/material`.** This is a near-total rewrite of
   the UI layer because the package was renamed and re-architected at v1.
   Only a handful of components are actually used (`import * as mui` in
   `ui/CodeEditor.tsx` and `ui/ScriptPicker.tsx`, plus the theme provider in
   `ui/index.tsx`). Map the old names to the new ones (e.g. `FlatButton` →
   `Button`, `getMuiTheme`/`lightBaseTheme` → `createTheme`). Consider whether
   the UI is simple enough to justify dropping MUI entirely and hand-rolling a
   few components — that would remove a large dependency.

3. **`three` 0.81 → latest (0.1xx).** The largest single risk. The codebase
   uses `THREE.BufferGeometry`, `WebGLRenderer`, `Mesh`, materials, textures,
   and the custom `shaders/*.glsl`. Expect churn in:
   - Texture / color-management API (`.encoding` → `.colorSpace`, sRGB
     handling) — `Game.ts` builds a `THREE.Texture` from a canvas.
   - `THREE.UVMapping` / `ClampToEdgeWrapping` and related constants were
     removed/renamed in later versions.
   - The vendored `lib/OrbitControls.js`, `StereoEffect.js`,
     `DeviceOrientationControls.js` are 2015 forks of three's own examples —
     replace with the official `three/examples/jsm/controls/…` equivalents
     (now ESM and maintained) once the three version is current.
   - Add `@types/three` and delete `typings/globals/three`.

   **Suggestion:** prototype the three upgrade in an isolated branch first,
   since the worker (`worker/`) and viewer (`app/`) both construct geometry.

### P2 — Type-safety & dead-weight removal

4. **Remove `underscore`.** Only ~7 files import it. Replace the handful of
   `_.` helpers in use (`sortBy`, `throttle`, `map`, etc.) with native ES2022
   (`Array.prototype.toSorted`, a tiny `throttle`, `Array.from`, etc.) or with
   `lodash-es` if the surface grows. This shrinks the worker bundle and
   removes a 2016 dependency.

5. **Convert `common/WorldInfo.ts` from a `namespace` to ES module exports.**
   `namespace Common { … } export = Common` is a legacy pattern; ~20 files
   do `import com from '…/WorldInfo'` and reference `com.WorldInfo`,
   `com.IntVector3`, etc. Convert to named exports and update import sites.
   This also lets `@typescript-eslint/no-namespace` be re-enabled globally.

6. **Type the worker protocol.** `worker/GeometryWorker.ts` and
   `app/WorkerInterface.ts` pass `Object` / `Function` and cast
   `e.data` with `as Invocation<…>` in a long if/else chain. Define proper
   discriminated-union message types (or use a small schema lib) so the
   host↔worker boundary is type-checked end to end. Re-enable
   `no-empty-object-type` and `no-unsafe-function-type` as the types land.

7. **Adopt `strict: true`** in `tsconfig.json` once the above are done, and
   add `@types/chai`/`@types/mocha` (or move to `vitest`, which is
   zero-config for TS) to retire the last of the 2015 typings snapshot.

### P3 — Product & architecture decisions

8. **Decide the fate of Google Cardboard.** The platform is disabled
   (commit `189d058`) and its code path is dead. Either (a) remove
   `CardboardPlatform`/`CardboardViewPoint`/`Webcam` and the related
   `lib/` helpers, or (b) invest in making it functional on modern mobile
   (device-orientation permissions, the Cardboard SDK, etc.). Recommend (a)
   for now and revisiting if there's real demand.

9. **Bundle size.** `app.js` is ~1.17 MB and `worker.js` ~518 KB (pre-gzip),
   both well over the 244 KiB budget webpack warns about. Options:
   - Lazy-load the code editor / UI (`React.lazy` + `import()`).
   - Split the three.js-heavy viewer from the React UI.
   - Confirm production minification is on (it is, via `mode: production`),
     and measure post-gzip sizes to set a real budget.
   - Consider `esbuild`/`swc` for faster builds and better tree-shaking of
     the three.js import.

10. **CI.** There is no CI. Add a GitHub Actions workflow running
    `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn lint`,
    `yarn test`, and `yarn build`. This is cheap and prevents regressions
    like the one where a bare `tsc` was silently broken.

### P4 — Nicer-to-have

11. **Prettier** for consistent formatting (currently mixed 2/4-space and
    quote styles).
12. **Migrate tests to `vitest`** (faster, native TS, first-class ESM) if the
    suite grows; the current single-file mocha setup is adequate for now.
13. **`engines` + `packageManager`** — pin the package manager (add a
    `packageManager` field for Corepack) so contributors don't drift between
    yarn/npm/pnpm.
14. **`ws` dependency placement** — `ws` is a `devDependency` but is used by
    `ws-cli/index.ts`, a runnable CLI, not just a build tool. Move it to
    `dependencies` if the CLI is meant to be run from a clean install.

---

## 4. Verification baseline

After this pass, from a clean checkout:

```
yarn            # install
yarn typecheck  # tsc --noEmit          → clean
yarn lint       # eslint .              → clean
yarn test       # mocha (via tsx)       → 3 passing
yarn build      # webpack (production)  → 3 size warnings only
```

The remaining three webpack warnings are asset-size advisories (see P3.9) and
are expected given the current bundle sizes.
