# Voxel lighting + ambient occlusion — COMPLETE (committed 2026-08-25)

Goal (met): replace the crude lighting (fixed-direction lambert + time-varying
"overcast" in the fragment shader, block-level heightmap "shade" on top
faces only) with proper Minecraft-style voxel lighting:

1. **Sky light propagation** (per-cell light level 0–15, flood fill with
   attenuation, opaque blocks block light, water attenuates).
2. **Per-face directional brightness** (top 1.0, bottom 0.5, x-sides 0.8, z-sides 0.6).
3. **Per-vertex ambient occlusion** (Minecraft "smooth lighting": each face
   vertex darkened by the 2 side + 1 corner neighbours in the face plane).

Per-vertex final light = `(skyLight/15) * faceBrightness * (aoLevel+1)/4`,
packed into the existing `data.z` attribute slot (replaces the old
block-level `shade`), interpolated in the shader (no more `floor`).

## Status

- [x] Explored the full pipeline (see "Current state (as found)" below).
- [x] Design (see below).
- [x] `worker/Partition.ts`: `light: Uint8Array | null`, `lightValid`.
- [x] `worker/Light.ts`: skylight engine (column pass + seed +
      addition/retraction queue, cross-partition push, batched updates,
      **and the round-3 self-support "pull" step** — see handover below).
- [x] `worker/World.ts`: `getOcclusionMask()`, `getLightAt()`,
      `ensureLightAround()`, block-change → light hooks, vblock 7→8 values
      (`shade` → `aoMask`), `computeOcclusion` + heightmap removed.
- [x] `worker/Commands/UndoableCommand.ts`: `onBlockChanged` callback.
- [x] `common/Constants.ts`: `VERTEX_DATA_SHADE` → `VERTEX_DATA_LIGHT`.
- [x] Shaders: `vLight` passed through unquantised, `gl_FragColor = col *
      max(vLight, 0.02)`; lambert/ambient/overcast/top-only-shade removed.
- [x] `worker/PartitionGeometry.ts`: round-2 geometry bugs A/B/C fixed,
      round-3 `vertexOffsets`/`indexInWorld` threaded into template geometry.
- [x] `worker/Geometry/Geometry.ts`: fence light via `world`, **and the
      `BufferAttribute.length` → `.count` fix (fences were invisible)**.
- [x] `spec/Light.spec.ts`: 17/17 pass, incl. brute-force property test
      (random worlds + 40 random edits each vs multi-source Dijkstra).
- [x] Verification: `yarn typecheck`, `yarn lint`, `yarn format:check`,
      `yarn build`, full `yarn test` = **33/33** (Light 17 + World 4 +
      headless UI sanity 12, WebGL canvas renders, no page/console errors).
- [x] Visual sanity (headless Chromium, screenshots analysed as ASCII
      luminance maps): dark rectangle under a roof with an edge gradient,
      open floor at full brightness, water pool with shine, pillars/fence
      visible, valley terrain shaded darker than open ground. Looks
      Minecraft-like.

### Re-verified and committed (2026-08-25)

Continuation session: the tree still held the full implementation
uncommitted. Re-ran the complete verification suite fresh — `yarn
typecheck` / `yarn lint` / `yarn format:check` clean, `yarn build`
compiles, `yarn test` **33/33** (Light 17 + World 4 + UI sanity 12;
canvas 94.1% non-white, no page/console errors, no failed requests).
Every claim above holds; nothing was lost between sessions. The work
was then committed as a single commit (13 modified files + 3 new:
`worker/Light.ts`, `spec/Light.spec.ts`, and this document).

## Handover — round 3, COMPLETE (read this first)

All round-2 items are done and verified. Nothing is left open.

### The engine bug (round-2 item 1) — root cause and fix

Symptom: order-dependent stale light across partitions. World 2×1×1
partitions of 4×8×4, slab over the top 3 rows of partition 1; loading p1
first then p0 left `(4,4,2)` at 12 instead of 14.

Traced with an instrumented repro (wrapping `processCell`/`columnPass`/
`blockChanged`/`drain` on the prototype and logging every write to the
watched boundary columns). Two facts emerged:

1. p1's light settled **correctly** at 0 under the slab while p0 was absent
   (there is genuinely no light source there without p0).
2. When p0 loaded, its boundary column (3,y,z) was written **15 by the
   column pass** — which never enqueues — and (in this scene) never churned
   during replay, so it was **never processed**.

The design flaw: `processCell` only **pushed** the processed cell's level
outward. A cell's correct level reaches its neighbours only if that cell is
processed after its last write. The column pass writes a whole partition
without enqueuing, and churn can lower a cell while its supporters are
transiently low — so a correct level could never flow, and the final drain
left p1's column stuck at values propagated from whichever p0 cells
happened to have been processed (14/14/14/13/12 gradient instead of 14
flat).

**Fix (in `Light.processCell`)**: before pushing, re-evaluate the cell's own
support and raise it if under-supported — processing now **pulls** as well
as pushes:

```ts
let level = p.light![c.rindex];
const cType = p.blocks![c.rindex * VALUES_PER_BLOCK];
if (!this.isOpaque(cType)) {
  const self = this.supportLevel(wx, wy, wz, cType);
  if (self > level) { p.light![c.rindex] = self; level = self; }
}
```

Correctness: the over-light invariant is preserved (current field ≤ true
field always, so `supportLevel` never overshoots); every lowering is
followed by the lowering cell's processing, whose pull step re-raises from
the (unchanged) supporters; after a drained queue no cell can be under- or
over-supported. Termination: levels are bounded integers; the brute-force
property test (3 seeds × random worlds × 40 edits vs Dijkstra) still passes
and now additionally validates the pull step.

### Round-3 test-side fixes

1. **Float32 precision** (round-2 item 2): `expectLights` and the two fence
   loops now use `toBeCloseTo(x, 5)` (lights live in a Float32Array;
   0.2 → 0.20000000298).
2. **Offset-partition scene** (round-2 item 3): as diagnosed — under-slab
   light attenuates from the open edges (`15 − min(4−x, 4−z)`), so the
   partition-0 test block moved to the slab's corner **(3,0,3)** with
   expected top-face lights `[1, 1, 14/15, 1, 1, 14/15]` (corner (0,0)
   samples (3,1,3)=14; the other three sample open columns at x=4/z=4).
   Partition-3 half (all 1.0) unchanged — the bug-A regression check.
3. **Fence test** (round-2 item 4) — the real bug was deeper than
   "offset attribute never written":
   - `Geometry.getVertexCount()` and `generateGeometry()` used
     `attributes.position.length` — **three r185's `BufferAttribute` has no
     `.length`** (it's `.count` vertices / `.array.length` components).
     `.length` was `undefined` → `NaN` → the vertex loop never ran → **the
     fence produced zero vertices: fences were completely invisible in the
     app** (round 2's "correctness-of-data, not a visual fix" assessment was
     wrong). Fixed to `.count`.
   - Per the round-2 plan, `Geometry.generateGeometry` now also receives
     `vertexOffsets: Uint32Array` + `indexInWorld` (from
     `PartitionGeometry.generateGeometry`) and writes
     `vertexOffsets[offset + i] = indexInWorld` per vertex, so the
     per-vertex `offset` attribute is populated for template geometry too.
4. **Side-face AO test** (round-2 item 5 pattern): the original scene's
   hand-computed expectations were wrong in two ways — two of the sampled
   outside cells *are* the occluder blocks themselves (a vertex pointing
   into a solid block reads light 0 — a genuine Minecraft artifact, and the
   correct behaviour), and the corner (0,0) could not reach AO level 2
   without an extra occluder. The scene was redesigned: block at
   **(1,1,1)** (so s1's −y neighbour is in-bounds) with occluders at
   **(2,0,1)** and **(2,1,0)** — side-neighbour cells only, never a sampled
   outside cell — giving a clean gradient across the four corners:
   AO 3 / 2 / 0 / 2, expected `[0.8, 0.6, 0.2, 0.6, 0.8, 0.2]`
   (side-1 corner order (1,1) (0,1) (0,0) (1,0) (1,1) (0,0)).

### Final verification (all on the final code)

- `yarn typecheck` — clean. `yarn lint` — clean. `yarn format:check` —
  clean (ran `yarn format`; it also normalised two pre-existing offenders,
  `common/WorldInfo.ts` and `worker/Operations/CuboidOperation.ts`).
- `yarn build` — webpack compiles.
- `yarn test` — **33/33**: `spec/Light.spec.ts` 17, `spec/World.spec.ts` 4,
  `test/ui/sanity.test.ts` 12 (headless Chromium + SwiftShader; canvas
  renders, 94.1% non-white; no page/console errors; no failed requests).
  Chromium was already installed (`~/Library/Caches/ms-playwright`).
- Visual: headless screenshots of a scripted showcase (17×17 stone floor
  y=18, 10×10 roof y=28 over the NW part, 4 pillars, two-block AO corner,
  2×2 water pool, 7-block fence run near spawn (100,24,120)), captured with
  `setGravity(0)` + `setPosition`/`setDirection` (the player otherwise
  falls — spawn is a valley with a pond at y=2, which also explains the
  naturally dark valley floor in default-view screenshots). Views analysed
  as ASCII luminance maps: roof shadow + edge gradient ✓, open floor full
  brightness ✓, water shine ✓, fence/pillars rendered ✓, no artifacts.

### Notes for future work

- The player spawn (100,24,120) is above a pond in a valley (surface
  water at y=2); the player falls to ~y=3.5 on boot. Cosmetic, pre-existing.
- The `offset` vertex attribute is still **declared but unread** in the
  vertex shader (app uploads itemSize 1) — pre-existing wart, out of scope;
  the data is now correct for all geometry if it is ever used.
- `Light` drain cost: the pull step adds one `supportLevel` (6 neighbour
  reads) per processed cell. Random 8³ worlds + 40 edits finish in
  well under the 120 s test budget; a 32³ partition first-geometry cost
  remains estimated at tens of ms in the worker.
- Repro/debug scripts used in this round were deleted after use
  (`/tmp/light-debug*.ts`, `/tmp/light-visual*.mjs`). To re-verify the
  cross-partition order: world 2×1×1 of 4×8×4, clear to air, slab
  `setBlocks(4,5,0,7,7,3,Stone)`, then `world.ensureLightAround(world.getPartitionByIndex(1))`;
  expect `(4,4,2)=14, (5,4,2)=13, (4,0,2)=14` regardless of load order.

## Round-2 verification findings (superseded — kept for reference)

Round 2 found and fixed: typecheck errors (Geometry `this.world`,
`SIDE_DEFS.map` helper signatures), the module-load crash that prevented
the spec from running, bug A (light sampled in local not world coords),
bug B (`AO_VERTEX_CORNER` wrong for sides 1, 4, 5 — now derived from
FACES), bug C (up-faces sampled one cell beyond the outside cell —
`FACE_SHIFT`), bug D (column pass over-lit top-row water by 1 — step cost
deducted before the write), and several wrong spec expectations. Round 3
then found the load-order engine bug (above) and the fence
`BufferAttribute.length` bug (above).

## Current state (as found)

- World: 32×1×32 partitions of 32×128×32 blocks (1024×128×1024 total),
  partitions lazily initialised in `World.loadPartition` (replays all
  commands on first load).
- `World.getVisibleBlocks(pindex)` → Int32Array of "vbblocks", now 8
  values each: `[id, rindex, windex, type, surroundingBlocks(27-bit),
  colour, aoMask]`. `surroundingBlocks` bit for neighbour offset (dx,dy,dz)
  = `(dz+1)*9 + (dy+1)*3 + (dx+1)`.
- Old `shade` (5×5 heightmap heuristic, top faces only) and
  `computeOcclusion` are removed.
- Shader: vertex passes `data.z` through as `vLight` (no +0.1 —
  continuous, interpolated); type/side/colour keep the +0.1/floor
  integer hack. Fragment: `light = max(vLight, 0.02)` (tiny ambient
  floor); `gl_FragColor = col * light`; white distance fog
  `(depth/128)^1.8` and water shine untouched.
- `app/WorldViewer.ts` uploads `data` as a vec4 attribute — no app-side
  changes needed (same layout).
- Block changes flow through `UndoableCommand.setBlock` (redo) and
  `UndoableCommand.undo`; both report via `onBlockChanged`. Commands are
  constructed only by `World` (`init` landscape, `setBlocks`).
- `getDirtyPartitions()` marks a partition + the 4 horizontal neighbours
  dirty when an edge block changes (edgeDirty); light can change up to 15
  blocks away, so the 4 neighbours of *every* affected partition are
  additionally marked dirty on any command.

## Design: skylight engine (`worker/Light.ts`)

- Light level 0–15 per cell, stored per partition
  (`Partition.light: Uint8Array`, `lightValid` flag). Once valid it is
  maintained in place by the engine (never bulk-invalidated).
- **Cost model** (Minecraft sky light): moving light from cell m to
  adjacent cell n costs 1 horizontally, 1 upward, 0 straight down (air);
  any move *into water* costs 1. Sky = cells above the world top: a
  transparent top-row cell gets 15 (14 if water).
- **Lazy per-partition computation** `ensurePartitionLight(p)`:
  1. Column pass (top→bottom per column): write 15 down transparent cells
     (−1 per water cell, step cost deducted *before* the write), 0 from
     the first opaque down. Always an exact lower bound (pure-sky
     contribution). **Does not enqueue** — safe because of the pull step.
  2. Seed pass: enqueue transparent cells still at 0 that have any
     in-bounds neighbour already > 0.
  3. Push to already-computed neighbours: enqueue their boundary cells
     this partition's light can raise.
  4. Mark valid.
- **Global work queue** (flat world indices, `Set` dedupe), drained to
  fixed point. `processCell(c, level L)`:
  1. **Pull**: re-evaluate `support(c) = max(sky(c), max over c's 6
     neighbours m of light(m) − cost(m→c))`; if `support > L`, raise c
     (round 3 — makes processing settle the cell to its current
     support, which is what makes the non-enqueued column-pass writes and
     churn-time lowerings safe).
  2. For each transparent neighbour n: `contrib = L − cost(c→n)`;
     `contrib > light(n)` → raise n, enqueue (addition);
     `light(n) > contrib` → check `support(n)`; if `support(n) < light(n)`
     → lower n, enqueue (retraction).
  - Unique fixed point of these rules is the correct light field (sky is
    the only source); after a drained queue no cell is under- or
    over-supported (see round-3 handover for the argument).
- Cross-partition: processing a cell in an uncomputed partition first runs
  that partition's column pass (guarded by `lightValid`), so light flows
  across boundaries as partitions come into existence. The queue never
  triggers a partition *load*.
- **Block changes** `blockChanged(wpos, oldType, newType)` (fired by
  `UndoableCommand.onBlockChanged`, wired by World): ensure the
  partition's light; opaque target: light → 0 (enqueue if it was > 0);
  transparent target: candidate = max(sky, neighbour contributions with
  the new costs); set if changed (enqueue).
- Drains happen at batch boundaries: `World` wraps `applyCommand`, `undo`
  and `loadPartition` command replay with `beginUpdate`/`endUpdate`
  (nesting counter).
- **Geometry reads**: `World.ensureLightAround(partition)` (7 partitions:
  p + 6 neighbours) at the top of `PartitionGeometry.generateGeometry`,
  then per-vertex `World.getLightAt(wx,wy,wz)` (fast path; above world →
  15, other out-of-bounds → 0 = void blocks light).

## Design: per-vertex AO

- `World.getOcclusionMask(partition, rindex)`: 27-bit mask like
  `surroundingBlocks` but only blocks that occlude AO (non-air, not water,
  not glass — like Minecraft).
- vblock layout: 8 values
  `[id, rindex, windex, type, surroundingBlocks, colour, aoMask]`.
- For each exposed face, 4 unique corners; per corner (in-plane coords
  (a,b) ∈ {0,1}², corner index `a + 2b`, matching the FACES vertex order —
  `AO_VERTEX_CORNER` is derived from FACES at module load):
  - `s1` = outer-plane neighbour at (a?+1:−1 on in-plane axis 1),
    `s2` = (b?+1:−1 on axis 2), `c` = diagonal; outer plane offset
    `pa?+1:−1` on the normal axis.
  - `aoLevel = (s1 && s2) ? 0 : 3 − s1 − s2` → factor `(ao+1)/4`.
  - Vertex light samples the *outside* cell (the air cell the face points
    into) at the corner: offset (a or b on in-plane axes, ±1 on normal)
    relative to the **block**, sampled at **world coordinates**
    (block + partition.offset + outside-cell offset). If the outside cell
    is itself an opaque block the vertex reads light 0 (Minecraft
    artifact, correct).
- Face brightness: `[x-:0.8, x+:0.8, bottom:0.5, top:1.0, z-:0.6, z+:0.6]`.
- Template geometry (fence): opaque; one light value for the whole block,
  sampled one cell above it (world coords), fixed 0.9 mid brightness;
  per-vertex `offset` attribute (world index) written for every vertex.

## Risks / things to verify — resolved

- Retraction cascade termination on adversarial edits (sealing long
  tunnels, undoing the landscape) — covered by spec tests incl. the
  brute-force property test with random edits.
- First-geometry cost: 7 partitions × (column pass + seed + BFS) in the
  worker — acceptable (worker thread); drain now includes the pull step.
- Stale light in neighbour partitions — dirtying the 4 horizontal
  neighbours of every affected partition (light influence ≤ 15 blocks <
  32 partition size), plus the load-order bug fix above.
