# Web Blocks — Modernisation Report

_A surface-level modernisation pass, the full P1 dependency upgrade
(React 19, hand-rolled UI, three 0.185), the full P2 type-safety &
dead-weight removal (underscore out, ES-module `WorldInfo`, typed
worker protocol, `strict: true`), and P3.8 (removal of the dead Cardboard
platform), P3.9 (real post-gzip size budgets), and all of P4 (Prettier,
the vitest migration, the `packageManager` pin, `ws` placement) were
completed on 2026‑08‑24. This document records what changed, what was
deliberately left alone, and a prioritised plan for the deeper work that
remains._

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
covered in the plan below. (All rows below were resolved during P2/P3 and
are kept for history; nothing remains in this table.)

| Area | Current | Why it stays for now |
|------|---------|----------------------|
| ~~`underscore`~~ | ~~1.8.3~~ — **removed in P2.4** | Replaced by native ES2022 / a 12-line `common/Throttle.ts`. |
| ~~`typings/globals/*` (chai, mocha, underscore)~~ | ~~2015 DefinitelyTyped snapshot~~ — **deleted in P2.4/P2.7** | Replaced by `@types/chai` and `@types/mocha`. The whole 2015 snapshot is now gone. |
| ~~`common/WorldInfo.ts` `namespace Common` pattern~~ | ~~legacy~~ — **ES module exports since P2.5** | `@typescript-eslint/no-namespace` re-enabled. |
| ~~`worker/` `Object` / `Function` typing~~ | ~~untyped protocol~~ — **typed in P2.6** | `common/WorkerProtocol.ts` discriminated unions; `no-empty-object-type` and `no-unsafe-function-type` re-enabled. |
| ~~Google Cardboard support~~ | ~~disabled~~ — **removed in P3.8** | Product decision taken: option (a), remove. `CardboardPlatform`/`CardboardViewPoint`/`DeviceOrientationControls` and the dormant `Webcam` feed implementation are gone; the hidden Webcam *block type* and shader hook remain for saved-world compatibility (see P3.8). |

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

8. **Decide the fate of Google Cardboard.** — done, option (a), 2026‑08‑24.
   The platform has been dead since `189d058`; it was removed:
   - `app/CardboardPlatform.ts`, `app/CardboardViewPoint.ts`, and
     `app/DeviceOrientationControls.ts` (its header said "kept for the
     (currently disabled) Cardboard platform"). `CardboardPlatform` was the
     only consumer of `three/examples/jsm/effects/StereoEffect`, so
     `app.js` shrank a further ~18 KiB (~765 → ~747 pre-gzip).
   - `Game`/`Interaction`/`App` cleaned of the platform union types, the
     webcam wiring, and the stale "Cardboard disabled" comment.
   - **Webcam nuance (the plan's list was slightly off):** `app/Webcam.ts`
     is not Cardboard — it implements the 2015 "Webcam" *block type*
     (commit `9b8714f`, which predates the Cardboard platform): a placed
     Webcam block renders the user's live camera feed via the shader's
     `webcam` sampler. It was nonetheless removed, because it was 100%
     dead in the modern app: the block is `hideFromToolbox` so `init()`
     was unreachable from any UI path, and the `webcam` uniform had
     already been commented out of `Game.init()`, so even a running feed
     would never have reached the shader.
   - **Kept for saved-world compatibility:** the "Webcam" entry +
     `BlockTypeIds.Webcam` in `BlockTypeList` (block-type *indices* are
     stored in world data — renumbering would corrupt saved worlds), the
     `textures/webcam.png` atlas tile, and the shader's `WEBCAM_ID` /
     `uniform sampler2D webcam` hook (left untouched, so a Webcam block in
     an old world renders exactly as it did before this change — from the
     never-bound sampler). Reviving the feature later is re-adding the
     class and binding the uniform; the block type, ID, and texture are
     already in place.

9. **Bundle size.** — done, 2026‑08‑24. Post-P1 the bundles shrank even
   though three.js grew: `app.js` is ~747 KiB (was ~1.17 MB; the P3.8
   Cardboard removal shaved a further ~18 KiB) and `worker.js` ~139 KiB
   (was ~518 KB) pre-gzip — modern three tree-shakes, and the 2016-era
   bundles shipped a lot of dead code. Measured post-gzip (the size that
   actually crosses the wire): `app.js` **195.1 KiB**, `worker.js`
   **38.9 KiB**, `style.js` **5.7 KiB** — ~240 KiB total for first load,
   a reasonable number for a three.js + React WebGL app. The original
   options were then evaluated and rejected as not worth their cost:
   - **Lazy-load the editor/UI** — rejected: the "code editor" is a
     hand-rolled `<textarea>` component (no editor library), and the whole
     `ui/` tree is a few KiB; code-splitting would save almost nothing
     while adding an async chunk to the core interaction path (the
     `test:ui` checks exercise the editor directly).
   - **Split the three.js viewer from the React UI** — rejected: both
     halves are needed on first paint, so splitting cannot reduce the
     initial payload; it would only add a second request.
   - **`esbuild`/`swc`** — not adopted: the build completes in ~3 s and
     modern three tree-shakes well (the 0.81 → 0.185 upgrade alone shrank
     the bundles); there is no size or speed problem left to solve.
   Budgets are now enforced instead of advisory:
   - `yarn size` (`size.ts`) gzips the built bundles and fails against
     post-gzip budgets — app ≤ 230 KiB, worker ≤ 48 KiB, style ≤ 12 KiB
     (~15–20 % headroom over the measured baseline; raise a budget
     deliberately and note it here).
   - `webpack.config.ts` sets `performance.maxAssetSize` /
     `maxEntrypointSize` to 800 KiB raw, so the build's own size warning
     only trips on genuine bloat instead of on every build (the default
     244 KiB limit is calibrated for typical apps, not three.js bundles).
     The production build is now warning-clean.

10. [SKIP] **CI.** There is no CI. Add a GitHub Actions workflow running
    `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn lint`,
    `yarn test`, and `yarn build`. This is cheap and prevents regressions
    like the one where a bare `tsc` was silently broken.

### P4 — Nicer-to-have — DONE

Completed 2026‑08‑24 in separate commits, with the full gate green after
each step.

11. **Prettier** for consistent formatting (currently mixed 2/4-space and
    quote styles). — done. `prettier@3` added as a devDependency, with a
    `.prettierrc.json` (`tabWidth: 2`, `singleQuote: true`,
    `printWidth: 100`) and a `.prettierignore` covering `build/`, vendored
    `lib/`, learner-facing `samples/`, binary `textures/`, and the
    hand-wrapped `*.md` docs (Prettier's markdown reflow breaks the
    hand-maintained line wrapping and list-item indents). New scripts:
    `yarn format` (write) and `yarn format:check` (the gate). 55 files
    reformatted — pure whitespace/quote/line-wrap changes, no behaviour
    change; `test:ui` still 12/12 afterwards. The two `shaders/*.glsl` files
    are untouched: Prettier 3.9 has no built-in GLSL parser, and a plugin for
    two small stable files was not worth the dependency.

12. **Migrate tests to `vitest`** (faster, native TS, first-class ESM) if the
    suite grows; the current single-file mocha setup is adequate for now.
    — done (at the user's request, ahead of the item's own growth trigger).
    `vitest@4` (+ its `vite@8` peer) replaces `mocha@11`: `yarn test` is now
    `vitest run`, which auto-discovers `*.spec.ts`, so the `test.ts` mocha
    entry file is gone. The spec imports `{ describe, expect, it }` from
    `vitest`; the assertion chains are unchanged (vitest's `expect` is
    chai-based, so `.to.be.equal` etc. work verbatim), which also let `chai`
    and its `@types` go — four dependencies removed, two added. `tsconfig`
    `types` dropped `"mocha"`. 3/3 tests pass, and the suite is now a
    first-class ESM/TS setup ready for more spec files.

13. **`engines` + `packageManager`** — pin the package manager (add a
    `packageManager` field for Corepack) so contributors don't drift between
    yarn/npm/pnpm. — done. `engines` (`node >= 20`) was already in place;
    added `"packageManager": "yarn@1.22.22"` for Corepack, pinning the exact
    yarn that produced the v1 `yarn.lock`. `yarn install --frozen-lockfile`
    re-verified clean; the lockfile is unchanged.

14. **`ws` dependency placement** — `ws` is a `devDependency` but is used by
    `ws-cli/index.ts`, a runnable CLI, not just a build tool. Move it to
    `dependencies` if the CLI is meant to be run from a clean install. —
    done. `ws` moved to `dependencies`: the CLI is a runnable deliverable
    (verified to boot and listen on :8001), so a production install must
    provide it. `@types/ws` stays a devDependency (type-check only). The web
    bundles are unaffected — `ws-cli` is not a webpack entry — and the v1
    lockfile does not record the dev/prod split, so it is unchanged.

---

## 4. Verification baseline

After this pass, from a clean checkout:

```
yarn            # install
yarn typecheck  # tsc --noEmit          → clean
yarn lint       # eslint .              → clean
yarn format:check # prettier --check .  → clean (P4.11; `yarn format` writes)
yarn test       # vitest run            → 3 passing
yarn build      # webpack (production)  → clean (P3.9 set real raw size limits)
yarn size       # post-gzip budgets     → ok (app ≤ 230 KiB, worker ≤ 48, style ≤ 12)
yarn test:ui    # playwright headless   → 12/12 (boots, world renders, worker pipeline, no console errors)
```

The build is warning-clean: P3.9 replaced the default 244 KiB asset
advisory with 800 KiB raw limits calibrated for a three.js bundle, and
the real (post-gzip) budget is enforced by `yarn size`.

**Standing rule (added 2026‑08‑24 after the ScriptStorage reload crash):**
after any big operation — a dependency upgrade, a broad typing change, or a
refactor that touches persisted state or the worker boundary — do not stop at
`typecheck`/`lint`/`build`. Run the headless browser check (`yarn test:ui`),
and if the change touches state that round-trips through JSON (localStorage,
postMessage), explicitly verify the reload/receive path: class identity does
not survive a round-trip (`Date` → ISO string, `Vector3` → plain object). The
P2 pass passed every static gate, yet the app still crashed on first reload
for anyone who had ever saved a script — only the browser caught it.
