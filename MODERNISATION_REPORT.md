# Web Blocks — Modernisation Report

_A surface-level modernisation pass, the full P1 dependency upgrade
(React 19, hand-rolled UI, three 0.185), and the full P2 type-safety &
dead-weight removal (underscore out, ES-module `WorldInfo`, typed
worker protocol, `strict: true`) were completed on 2026‑08‑24. This
document records what changed, what was deliberately left alone, and a
prioritised plan for the deeper work that remains._

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
  (`es6-promise`, `whatwg-fetch`, and four `react-addons-*` packages that
  nothing imported); replaced `ts-node` with `tsx` (the old
  `mocha --require ts-node/register` script was broken — `ts-node` was never
  even a declared dependency); bumped `chai` `3 → 4`; added `eslint`,
  `@eslint/js`, `typescript-eslint`, `globals`, `http-server`, `mocha`.
  - Note: `react-tap-event-plugin` was initially removed as deprecated but
    restored — material-ui 0.15's `Tabs`/buttons only react to the synthetic
    `topTouchTap` event that this plugin generates, so without it the Script
    tab (and all MUI buttons) stopped working. It was removed again once P1.2
    replaced MUI with the hand-rolled UI.
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
covered in the plan below. (The first four rows below were resolved during
P2 and are kept for history; only Cardboard remains.)

| Area | Current | Why it stays for now |
|------|---------|----------------------|
| ~~`underscore`~~ | ~~1.8.3~~ — **removed in P2.4** | Replaced by native ES2022 / a 12-line `common/Throttle.ts`. |
| ~~`typings/globals/*` (chai, mocha, underscore)~~ | ~~2015 DefinitelyTyped snapshot~~ — **deleted in P2.4/P2.7** | Replaced by `@types/chai` and `@types/mocha`. The whole 2015 snapshot is now gone. |
| ~~`common/WorldInfo.ts` `namespace Common` pattern~~ | ~~legacy~~ — **ES module exports since P2.5** | `@typescript-eslint/no-namespace` re-enabled. |
| ~~`worker/` `Object` / `Function` typing~~ | ~~untyped protocol~~ — **typed in P2.6** | `common/WorkerProtocol.ts` discriminated unions; `no-empty-object-type` and `no-unsafe-function-type` re-enabled. |
| Google Cardboard support | disabled | Non-functional; needs a product decision (see P3). Its code now compiles against three 0.185 (ported `DeviceOrientationControls`, official `StereoEffect`), so option (b) is cheaper than it was. |

---

## 3. Suggested next steps (prioritised)

### P1 — Upgrade the 2016 runtime dependencies (biggest value, biggest effort) — DONE

Completed 2026‑08‑24 in separate commits, in the planned order, with the full
gate (typecheck, lint, test, build, test:ui) green after each step.

1. **React 15 → 19.** — done. As planned: `ReactDOM.render` → `createRoot`,
   `childContextTypes`/`getChildContext` dropped, string refs → callback refs,
   `react-dom` in lockstep, `@types/react@19` / `@types/react-dom@19` added
   and `typings/globals/react*` deleted.

2. **`material-ui@0.15` → hand-rolled UI.** — done, with a better outcome than
   the plan: the UI turned out to be simple enough that MUI was dropped
   entirely rather than migrated to `@mui/material`. `ui/widgets.tsx`
   implements the handful of components used (tabs, buttons, dialogs, lists);
   `react-tap-event-plugin` and `typings/globals/material-ui` went with it.
   One large dependency removed instead of swapped.

3. **`three` 0.81 → 0.185.** — done. The API churn was mostly mechanical:
   - `BufferGeometry.addAttribute` → `setAttribute`; `PlaneBufferGeometry` →
     `PlaneGeometry` (unified in r125).
   - `THREE.Geometry` + `.merge` / `fromGeometry` (gone in r125) —
     `worker/Geometry/FenceGeometry.ts` rebuilt with `BoxGeometry` +
     `BufferGeometryUtils.mergeGeometries`, same transforms (T·S matrices).
   - `THREE.Texture` constructor arguments (mapping/wrap/filters, gone in
     r132) set as properties; `THREE.VertexColors` parameter dropped
     (the block shader uses its own `data` attribute, not three's
     vertex-colors mechanism); `MeshBasicMaterial` `overdraw` option dropped.
   - `Frustum.setFromMatrix` → `setFromProjectionMatrix`;
     `Box3.getCenter` now requires a target vector;
     `camera.matrixWorldInverse` updated via `.copy(…).invert()`
     (`Matrix4.getInverse` is gone).
   - Vendored 2015 control forks replaced: `StereoEffect` imported from the
     official `three/examples/jsm/effects/`; `DeviceOrientationControls`
     ported to `app/DeviceOrientationControls.ts` (upstream removed it from
     the examples); `OrbitControls` deleted (referenced only in a comment —
     the desktop platform uses pointer lock, not orbit).
   - `@types/three@0.185` added; `typings/globals/three` (6.7 KB of 2015
     declarations) deleted.
   - The custom `shaders/block.*.glsl` (`RawShaderMaterial`, GLSL ES 1.00)
     needed **no changes** — WebGL2 still accepts ES 1.00 shaders, and the
     hand-rolled lighting/fog are independent of three's scene lights.

   **The one real bug (caught only by `yarn test:ui`):** the app rendered a
   pure-white canvas with thousands of draw calls executing. `postMessage`
   strips class identity, so the player position/target arriving from the
   worker are plain `{x, y, z}` objects; three 0.81's `lookAt(vector)` did
   `_v1.copy(vector)` (tolerates plain objects), but modern three's
   `lookAt(x, y, z)` gates on `x.isVector3` and otherwise calls
   `_v1.set(object, undefined, undefined)` — a NaN view matrix that made the
   GPU discard every vertex. Fixed in `DesktopViewPoint.onPlayerPositionChanged`
   by passing explicit numbers, and `PlayerPositionChangeArgs` now uses the
   new `PlainVector3` type so the worker boundary types tell the truth.
   Lesson: `test:ui`'s "pixels are not uniform" check is what typechecking
   and builds cannot see — keep it in the gate.

   Bundle effect: `app.js` ~1.17 MB → ~765 KiB and `worker.js` ~518 KB →
   ~155 KiB (pre-gzip) — modern three tree-shakes, and the 2016-era bundles
   shipped a lot of dead code.

### P2 — Type-safety & dead-weight removal — DONE

Completed 2026‑08‑24 in separate commits, with the full gate green after
each step.

4. **Remove `underscore`.** — done. Replaced the `_.` helpers in use with
   native ES2022: `sortBy` → `Array.prototype.toSorted`, `map`/`values` →
   `Array.from`/object spread, and a tiny hand-rolled `throttle`/`debounce`
   in `common/Throttle.ts`. The dependency, its 2015 typings, and the last
   `require()` in the tree are gone; the worker bundle shrank further.
   - Footnote: `_.sortBy(loaded, 'modified')` became
     `toSorted((a, b) => a.modified.getTime() - b.modified.getTime())` —
     which crashed on reload for users with saved scripts (`modified`
     round-trips through localStorage as an ISO string). Caught in the user's
     browser, fixed in `ScriptStorage.load()`; see the field-bug note in
     P2.7 and the standing rule in §4.

5. **Convert `common/WorldInfo.ts` from a `namespace` to ES module exports.**
   — done. ~20 import sites updated to named imports;
   `@typescript-eslint/no-namespace` re-enabled globally.

6. **Type the worker protocol.** — done. `common/WorkerProtocol.ts` now
   declares the host↔worker boundary as discriminated unions
   (`WorkerRequest`/`WorkerMessage`, `RequestFor<Action>`), so
   `WorkerInterface.invoke<Return, Action>()` pins the payload type per
   action and `GeometryWorker`'s `onmessage` is an exhaustive switch. No
   schema lib needed — the protocol is small. `no-empty-object-type` and
   `no-unsafe-function-type` re-enabled.

7. **Adopt `strict: true` + modern test typings.** — done.
   - `@types/chai` and `@types/mocha` added; `typings/globals/{chai,mocha}`
     and `typings/index.d.ts` deleted — the 2015 DefinitelyTyped snapshot is
     fully retired. `types: ["node", "mocha"]` in `tsconfig.json`.
   - `strict: false` + `noImplicitAny: true` → `strict: true`. The resulting
     69 errors were almost all the legacy `field: T = null` pattern; fix
     policy (behaviour-preserving):
     - **Truly-nullable state** → widen to `T | null` (e.g.
       `Interaction.tool`, `CuboidTool`'s state-machine fields,
       `Partition.blocks` until `init()`, the lazy listener fields on
       `Player`/`WorkerInterface`, `CliServer.cliSocket`,
       `BlockType.textures` — the Fence block type has no textures yet).
     - **Assigned-before-use** (constructor or the `init()` that runs before
       first use) → definite-assignment `!` (`Game`'s fields,
       `World.partitions`, `Player.position`/`velocity`, …).
     - **State-machine-guaranteed reads** → `!` at the use site with a
       comment explaining the invariant (`CuboidTool` reads after the state
       that set them, `World.blocks` reads after `loadPartition` inits).
     - **Honest nullability in signatures** → `Tool.onMouseClick/Move` now
       take `pos: IntVector3 | null, side: number | null` (they always were
       passed null for non-block hovers); `getAffectedPartitionIndices()`
       returns `number[] | null` (null = every partition — the callers
       already checked it); `light: THREE.Light | null` (Game passes null;
       the desktop light uses are commented out).
     - Two small latent bugs surfaced and fixed: `ScriptRunner`'s catch used
       `err.message` on an `unknown` (non-Error throws from learner scripts
       yielded `undefined`) → now `err instanceof Error ? err.message :
       String(err)`; `Game.getBlockTexture` only null-checked `top`, now
       checks `side` too (no behaviour change — only Fence is null and both
       of its textures are null).
   - `shims.d.ts` added: the 2015 typings snapshot had declared the raw-text
     `*.js` sample imports; a 12-line ambient shim replaces it (webpack
     inlines `samples/*.js` with `type: "text"`).
   - **Field bug caught only in the user's browser:** after the P2 pass the
     app crashed on reload for anyone who had ever saved a script —
     `ScriptStorage.load()` threw `t.modified.getTime is not a function`
     (and the module-init abort cascaded into `App is not defined`). Cause:
     `save()` JSON-stringifies the script list, which turns each `Date`
     `modified` into an ISO string; the re-parse on load then hit the
     P2.4 `toSorted(... .getTime())` comparator. Fresh headless profiles
     have empty localStorage, so every automated run was clean — the user's
     browser was the only environment with round-tripped state. Fix:
     `load()` restores `modified` to a `Date` while parsing; `test:ui`
     gained a save-then-reload step (9) so the round-trip is covered going
     forward. This is why §4 now has a standing rule.

### P3 — Product & architecture decisions

8. **Decide the fate of Google Cardboard.** The platform is disabled
   (commit `189d058`) and its code path is dead. Either (a) remove
   `CardboardPlatform`/`CardboardViewPoint`/`Webcam` and the related
   `lib/` helpers, or (b) invest in making it functional on modern mobile
   (device-orientation permissions, the Cardboard SDK, etc.). Recommend (a)
   for now and revisiting if there's real demand.

9. **Bundle size.** Post-P1 the bundles shrank even though three.js grew:
   `app.js` is ~765 KiB (was ~1.17 MB) and `worker.js` ~155 KiB (was
   ~518 KB) pre-gzip — modern three tree-shakes, and the 2016-era bundles
   shipped a lot of dead code. Only `app.js` still exceeds the 244 KiB
   webpack budget. Options:
   - Lazy-load the code editor / UI (`React.lazy` + `import()`).
   - Split the three.js-heavy viewer from the React UI.
   - Confirm production minification is on (it is, via `mode: production`),
     and measure post-gzip sizes to set a real budget.
   - Consider `esbuild`/`swc` for faster builds and better tree-shaking of
     the three.js import.

10. [SKIP] **CI.** There is no CI. Add a GitHub Actions workflow running
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
yarn build      # webpack (production)  → size warnings only (app.js, see P3.9)
yarn test:ui    # playwright headless   → 11/11 (boots, world renders, worker pipeline, no console errors)
```

The remaining webpack warnings are asset-size advisories for `app.js` only
(see P3.9) and are expected given the current bundle sizes.

**Standing rule (added 2026‑08‑24 after the ScriptStorage reload crash):**
after any big operation — a dependency upgrade, a broad typing change, or a
refactor that touches persisted state or the worker boundary — do not stop at
`typecheck`/`lint`/`build`. Run the headless browser check (`yarn test:ui`),
and if the change touches state that round-trips through JSON (localStorage,
postMessage), explicitly verify the reload/receive path: class identity does
not survive a round-trip (`Date` → ISO string, `Vector3` → plain object). The
P2 pass passed every static gate, yet the app still crashed on first reload
for anyone who had ever saved a script — only the browser caught it.
