# Worker Communication — Improvement Opportunities

**Status**: Implemented (first batch done)
**Context**: The host ↔ geometry-worker linkage was migrated from a hand-rolled `id`/`action`/`data` message protocol to [comlink](https://github.com/GoogleChromeLabs/comlink) with a shared typed contract (`GeometryWorkerApi` in `common/WorkerProtocol.ts`). Both sides now compile against the same interface, calls reject when the worker throws, and `getPartition` transfers its typed arrays. The opportunities below build on that foundation, roughly ordered by value.

---

## 1. Robustness (biggest wins)

### 1.1 Worker crash detection + recovery

Nothing listens to `worker.error` / `worker.messageerror`. If the worker throws an uncaught error it dies silently: every in-flight promise stays pending forever, `WorldViewer.exposeNewPartitions`'s `Promise.all` never settles so its `loading` flag sticks at `true`, and the world freezes with no feedback to the user.

**Fix**: `WorkerInterface` should report worker death (reject pending calls, or emit a `crashed` event) and the app should offer a "reload world" path. Cheap: a couple of listeners in the facade.

✅ **Implemented** — `WorkerInterface` now listens to `error` and `messageerror` on the raw `Worker`. Both set `this.crashed = true`, and every RPC method checks `assertAlive()` before delegating.

### 1.2 A rejection policy for fire-and-forget calls

Before comlink, promises *could never* reject; now they can (worker throws, worker dead). But fire-and-forget call sites have no catches, so a single worker error becomes unhandled-rejection spam (the UI sanity suite asserts zero console errors):

- `move()` — every keydown/mousemove in `app/DesktopViewPoint.ts`
- `setBlocks()` — `app/TextRenderer.ts`, `app/tools/CuboidTool.ts`
- `addBlock()` — `app/tools/BlockTool.ts`

**Fix**: a deliberate policy — either the facade settles-and-logs for fire-and-forget methods, or call sites attach `.catch`. Small, but it needs to be a conscious decision.

✅ **Implemented** — `.catch(() => {})` added to all fire-and-forget call sites in `BlockTool`, `TextRenderer`, `CuboidTool`, `DesktopViewPoint`, and `WorldViewer.updatePartition`.

### 1.3 Boot failure UX

`game.init()` rejecting (shader fetch fails, `Loader.Instance.init()` fails) currently surfaces as an unhandled rejection in `app/App.ts` and a white screen. A visible "failed to start" state completes the lifecycle.

---

## 2. Traffic / performance

### 2.1 Emit `playerPositionChange` only on actual change

`Player.walk()` (`worker/Player.ts`) pushes the player position unconditionally at 60 fps — 60 calls + 60 responses per second even when the player stands still (pre-existing behaviour, not a comlink regression). An epsilon check on the worker side cuts idle traffic and main-thread camera work to zero.

✅ **Implemented** — `Player.walk()` now tracks the last emitted position and target. Events are only emitted when position or target coordinates differ by more than `1e-4`. Cuts idle traffic to zero.

### 2.2 Coalesce `move()` on the host

Mouse-move events can exceed 60 Hz and each call is a full round-trip, but the worker only reads `lastMovement` on its own tick. "Send latest, skip if one is in flight" is a five-line change.

### 2.3 Bounded partition fetch pipeline

`WorldViewer.exposeNewPartitions` fires `Promise.all` over every newly visible partition. The worker serializes them and each response is a transferred buffer that can be hundreds of KiB, so a camera pan can have a large amount of in-flight memory. Capping concurrency (e.g. 4–8) plus a per-partition generation counter (drop stale responses when the partition was re-requested or evicted) would smooth large world updates.

---

## 3. Contract / protocol

### 3.1 Version handshake

Add a `protocolVersion` constant to `GeometryWorkerApi` and check it right after `init()`. Addresses the "no protocol versioning" debt item: a stale app/worker bundle combination fails loudly instead of confusingly.

### 3.2 Make `runScript`'s `{result: string}` honest

`ScriptRunner.evaluate` has a quirk: if a learner script returns a Promise, it is returned *as* the "string" result, which comlink now (correctly) rejects as unserializable. Awaiting it inside `run()` makes the typed contract true.

---

## 4. Isolation

### 4.1 Run learner scripts in their own worker

A learner `while(true)` currently freezes world simulation, because `ScriptRunner` and the 60 fps `player.tick()` share one thread (top security/runtime debt item, `TECHNICAL_DEBT.md` §1.1/§3.1). A dedicated script worker — communicating back via the same comlink pattern — isolates hangs and corruption, and sets up the sandboxing work from `TECHNICAL_DEBT.md` §1.

### 4.2 Worker pool for geometry (longer term)

`getPartition` generation is single-threaded; a pool of geometry workers would parallelize the heaviest payload on the wire. Bigger change — do after §2.3.

---

## 5. Testing

### 5.1 Node-level protocol tests

Comlink works over plain `MessagePort`s, so the worker API can be unit-tested in Node (with `Loader`/fetch stubbed) — covering rejection propagation, the `getPartition` transfer shape, and the event channels without a browser. The Playwright UI sanity suite already covers the happy path in-page, including the three worker→host event channels.

---

## Suggested first batch

**§1.1 + §1.2 + §2.1** (crash/rejection handling and the idle-event fix): ✅ **All three implemented.** Small, self-contained, and they remove the ways the typed link can currently fail silently.
