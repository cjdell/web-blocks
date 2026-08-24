# Technical Debt Analysis — Web Blocks

**Project**: `web-blocks` — A WebGL/Three.js world-building educational sandbox  
**Codebase size**: ~3,500 LOC (app/worker/common/ui), 167 commits, 19 source files  
**Last modernisation**: 2026-08-24 (P1–P4 complete: React 15→19, Three 0.81→0.185, underscore removal, strict typing, Cardboard removal, vitest migration, Prettier, bundle budgets)

---

## Summary

The project is well-structured around a layered Host/Client/Worker architecture and has completed its major modernisation (P1–P4). However, significant technical debt remains in **six categories**:

| Category | Severity | Key Issues |
|----------|----------|------------|
| **Security** | 🔴 Critical | Dynamic `new Function()` execution with full context access; no script sandbox |
| **Testing** | 🔴 Critical | Only 3 spec files exist (none in `test/`); no unit tests for worker/business logic |
| **Runtime** | 🟠 High | Memory leaks (unbounded interval refs, Player.boundScripts); O(n³) block loops |
| **Architecture** | 🟠 High | `Operation.ts` is a stub (throws "Not implemented"); tight coupling |
| **Data Integrity** | 🟠 Medium | No JSON schema validation; `Date` round-trip bugs in localStorage |
| **Code Quality** | 🟡 Medium | 40+ `any` casts; dead console.log statements; no CI; no Lint-staged |

---

## 1. Security 🔴 Critical

### 1.1 Dynamic Code Execution — `new Function()` with Full Context Access

**Location**: `worker/ScriptRunner.ts` (lines 33–65)

```ts
const func = new Function('context', toRun.join(''));
const res = func(this.api);  // ← full Api object passed as 'context'
```

**Problem**: Learner scripts are executed via `new Function()`, which grants them:
- Full access to every `Api` method (including `world`, `player`, `undo`, `redo`)
- Full access to the `Api.prototype` for arbitrary method binding
- No code sandboxing, no resource limits, no timeout enforcement
- The `expr` mode allows returning values, enabling data exfiltration

**Impact**: A malicious learner script can call `api.world.setBlocks()` to corrupt world state, `api.player.position` to move the player, or `api.undo`/`api.redo` to manipulate undo stacks. There is no separation between "safe" API and "dangerous" API.

**Remediation**:
1. Split `Api` into `SafeApi` (read-only: `getBlock`, `getPartition`) and `PowerApi` (writes: `setBlocks`, `runScript`, `undo`, `redo`)
2. Restrict which methods learner scripts can access via a whitelist
3. Add a timeout (`setTimeout` with max execution time) to prevent infinite loops
4. Consider running scripts in a WebAssembly sandbox or a restricted eval environment

---

### 1.2 Script Storage Without Validation — `ScriptStorage.ts`

**Location**: `app/ScriptStorage.ts` (lines 195–204)

**Problem**:
- `putScript()` allows overwriting sample scripts with non-sample scripts
- No schema validation on stored scripts
- `localStorage` is treated as a safe store, but XSS via `localStorage` injection is a known attack vector
- The `modified` field round-trips through `JSON.stringify` (Date → ISO string) and back, which the P2.7 pass partially fixed but the pattern remains fragile

**Impact**: A stored script with malicious content is executed on every reload. Sample scripts can be replaced with malicious code.

**Remediation**:
1. Validate script content on load (basic syntax check or AST validation)
2. Never allow overwriting sample scripts
3. Consider using `IndexedDB` instead of `localStorage` for larger payloads
4. Add a `version` field for migration paths

---

### 1.3 Worker API Over-Exposure

**Location**: `worker/Api.ts`

**Problem**: The `Api` class exposes `world`, `player`, and internal state directly to learner scripts. The `bindRightClick` method binds the player's right-click handler, which gives scripts access to the player object.

**Impact**: Scripts can manipulate the player's position, view, and interactions without permission.

**Remediation**:
1. Audit `Api.ts` for every method and classify as safe/dangerous
2. Remove `world` and `player` direct references from the exposed `Api` object
3. Replace with a controlled event/notification system

---

## 2. Testing 🔴 Critical

### 2.1 Almost No Test Coverage

**Current state**:
- `test/spec/World.spec.ts` — 96 lines, only tests `World` partition creation and indexing
- **No tests** for `ScriptRunner`, `Partition`, `Player`, `Api`, `UndoableCommand`, `CuboidOperation`, `LandscapeOperation`
- The 3 passing tests are integration-style (exercise real world creation, not isolated logic)

**Impact**: Any change to core logic (especially undo/redo, partition management, or script execution) has no safety net. The P2.7 field bug (ScriptStorage `Date` round-trip crash) was only caught in a real user's browser.

**Remediation**:
1. Add unit tests for `ScriptRunner.evaluate()` (valid code, error handling, retry logic)
2. Add unit tests for `Partition.setBlock()`, `getBlock()`, `rangeCheck()`
3. Add tests for `Player.position`, `velocity`, `walk()` boundary checks
4. Add tests for `UndoableCommand.undo()` and `OperationCommand.redo()`
5. Add tests for `CuboidOperation.getBlocks()` and `LandscapeOperation.getBlocks()`
6. Add integration tests for the worker protocol (postMessage ↔ workerInterface)

---

### 2.2 No CI Pipeline

**Current state**: No GitHub Actions or CI configuration.

**Impact**: The P2.7 bug (ScriptStorage crash on reload) was caught only in a user's browser. Without CI, regressions go undetected.

**Remediation**: Add a GitHub Actions workflow running `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn lint`, `yarn test`, `yarn build`, and `yarn test:ui`.

---

### 2.3 Vitest Config is Minimal

**Current state**: `vitest.config.mts` has only a 60s timeout and no coverage targets.

**Impact**: No enforcement of test coverage, no test organization.

**Remediation**: Add coverage thresholds, organize tests by module, add snapshot tests for JSON serialization.

---

## 3. Runtime 🟠 High

### 3.1 Memory Leaks — `ScriptRunner.ts`

**Location**: `worker/ScriptRunner.ts` (lines 27–28, 19, 152–165)

**Problem**:
- `this.api.clearIntervals()` and `this.api.clearTimeouts()` are called but there's no evidence these methods actually clean up references
- The `evaluate()` method creates a `Function` on every call — no caching
- The `intervalRefs` and `timeoutRefs` arrays (in `Api`) grow unbounded with no cleanup

**Impact**: Over time, memory usage grows as intervals/timeout references accumulate without proper cleanup.

**Remediation**:
1. Implement a proper timer registry with `clear()` methods
2. Cache compiled scripts (by code string) to avoid recompilation
3. Add a memory audit (`performance.memory` or `console.memory` in DevTools)

---

### 3.2 O(n³) Block Operations

**Location**: `worker/Partition.ts`, `worker/Operations/*.ts`

**Problem**:
- `Partition.setBlocks()` uses nested z/y/x loops — O(n³) for large worlds
- `CuboidOperation.getBlocks()` iterates through blocks one at a time
- `getVisibleBlocks()` iterates through all blocks to check visibility

**Impact**: For a 100×100×100 world, setBlocks is 1 billion iterations. Even at 10M ops/sec, this takes ~100 seconds.

**Remediation**:
1. Batch block operations (accumulate blocks, set them all at once)
2. Use `Uint8Array.set()` for bulk assignment instead of individual `set()` calls
3. Cache visibility results and only recalculate when the camera moves significantly

---

### 3.3 Error Handling Gaps

**Location**: `worker/ScriptRunner.ts`, `worker/Partition.ts`, `worker/Operations/Operation.ts`

**Problem**:
- `Operation.ts` is a stub with `throw new Error('Not implemented')` in every method
- `ScriptRunner.evaluate()` retries only once before giving up
- `Partition.rangeCheck()` throws errors that are not caught in the call chain
- `Player.walk()` performs boundary checks but doesn't handle edge cases gracefully

**Impact**: A broken operation or out-of-bounds access crashes the worker without user feedback.

**Remediation**:
1. Implement `Operation.ts` (or document it as intentionally disabled)
2. Increase retry attempts in `ScriptRunner.evaluate()` (3–5)
3. Add try/catch at the worker level to prevent crashes
4. Add graceful degradation for missing data

---

### 3.4 Worker Protocol Fragility

**Location**: `app/WorkerInterface.ts`, `worker/GeometryWorker.ts`

**Problem**:
- No protocol versioning — a message format change breaks all clients
- No message acknowledgment — a lost postMessage leaves the client in an inconsistent state
- No retry logic for failed messages
- The worker uses `self.postMessage()` with no queue management

**Impact**: Network instability or worker crashes can leave the UI in a broken state.

**Remediation**:
1. Add message IDs and acknowledgment
2. Implement retry logic with exponential backoff
3. Add protocol version headers
4. Add a message queue in the worker to handle bursts

---

## 4. Architecture 🟠 High

### 4.1 `Operation.ts` Is a Stub

**Location**: `worker/Operations/Operation.ts` (22 lines)

```ts
getAffectedPartitionIndices() { throw new Error('Not implemented'); }
getBlocks(_pindex) { throw new Error('Not implemented'); }
```

**Problem**: This is a documented interface that nothing implements (CuboidOperation, LandscapeOperation, and TreeOperation are all in `Operations/` but the base class is a stub). This indicates either:
- The architecture was designed but never fully implemented
- There's a gap in the feature set

**Impact**: The `OperationCommand` class depends on `Operation.getBlocks()` which would crash if called. This is a latent bug waiting to be triggered.

**Remediation**:
1. Implement the base `Operation` class with a default that throws a helpful error
2. Document the intended architecture in a comment
3. Add a test that verifies the interface contract

---

### 4.2 Tight Coupling Between Layers

**Problem**:
- `DesktopPlatform` directly instantiates `WorkerInterface` — no dependency injection
- `WorldViewer` is tightly coupled to `WorldInfo` and `WorkerInterface` — no abstraction layer
- `TextRenderer` directly calls `workerInterface.setBlocks()` — UI logic is not testable in isolation
- `BlockTool` and `CuboidTool` share similar state management but are duplicated implementations

**Impact**: Hard to test, hard to swap implementations, hard to modify.

**Remediation**:
1. Introduce an `IWorkerInterface` abstraction
2. Use dependency injection for worker communication
3. Extract `ToolState` shared between `BlockTool` and `CuboidTool`
4. Split `WorldViewer.ts` into `SceneManager`, `PartitionManager`, `CullingManager`

---

### 4.3 No Dependency Injection

**Problem**: Everything is wired in `App.ts`. No constructor injection, no service locator pattern.

**Impact**: Components cannot be tested in isolation.

**Remediation**:
1. Refactor constructors to accept dependencies
2. Use a lightweight DI container or explicit constructor injection
3. Add mock support for testing

---

## 5. Data Integrity 🟠 Medium

### 5.1 JSON Serialization Round-Trips

**Location**: `app/ScriptStorage.ts`

**Problem**:
- `Date` objects round-trip through `JSON.stringify` → ISO string → `JSON.parse`
- The P2.7 pass partially fixed this by restoring `modified` to a `Date` in `load()`, but the pattern is fragile
- No schema validation on stored data
- No versioning for schema migrations

**Impact**: The P2.7 pass itself caused a crash on reload for users with saved scripts (the `t.modified.getTime is not a function` bug). This is a recurring pattern.

**Remediation**:
1. Add a `version` field to scripts and validate on load
2. Use a proper serialization library (e.g., `superstruct` or `io-ts`)
3. Add migration logic for schema changes
4. Add tests for serialization round-trips

---

### 5.2 No Schema Validation

**Problem**: Scripts are stored in `localStorage` as JSON without any validation.

**Impact**: Corrupted data can crash the app on load.

**Remediation**:
1. Add JSON schema validation on load
2. Add error recovery (partial load, skip corrupted scripts)
3. Add data integrity checks (hash verification)

---

## 6. Code Quality 🟡 Medium

### 6.1 Excessive `any` Types

**Count**: 40+ instances across the codebase

**Location**: `app/MiniConsole.ts` (10+), `app/DesktopViewPoint.ts` (10+), `app/Game.ts` (3), `app/Interaction.ts` (3), `worker/Api.ts` (2), `worker/ScriptRunner.ts` (1)

**Problem**: `any` types defeat TypeScript's type safety. The `MiniConsole` and `DesktopViewPoint` files use `any` for event handlers, which is a common pattern but should be replaced with proper event type definitions.

**Impact**: Type errors are silent. The `any` cast in `ScriptRunner.ts` (line 14: `(Api.prototype as any)[key]`) is particularly dangerous because it allows arbitrary property access.

**Remediation**:
1. Define proper event handler types for `MiniConsole` and `DesktopViewPoint`
2. Replace `any` with proper types in `Game.ts` (`renderer`, `effect`, `uniforms`)
3. Audit all `any` usages and replace with proper types

---

### 6.2 Dead Code and Console Statements

**Count**: 15+ `console.log`/`console.warn`/`console.error` statements, many commented out

**Location**: `app/MiniConsole.ts` (1), `app/DesktopViewPoint.ts` (2), `app/WorldViewer.ts` (6), `worker/PartitionGeometry.ts` (1), `worker/GeometryWorker.ts` (2), `worker/Player.ts` (1), `worker/ScriptRunner.ts` (1), `worker/Cli/CliServer.ts` (1), `worker/Operations/TreeOperation.ts` (1), `worker/Commands/UndoableCommand.ts` (1), `worker/World.ts` (1)

**Problem**: Dead console statements pollute the codebase and indicate unfinished work or removed features.

**Impact**: Confusing for new developers, may trigger lint warnings.

**Remediation**:
1. Remove all dead `console.*` statements
2. Add a lint rule to detect dead console statements
3. Add a lint rule to detect commented-out console statements

---

### 6.3 No Lint-Staged

**Problem**: The project has `yarn lint` and `yarn format:check` scripts but no pre-commit hook.

**Impact**: Developers can push unlinted/unformatted code.

**Remediation**: Add `lint-staged` to run `yarn lint` and `yarn format` before each commit.

---

### 6.4 No Prettier for GLSL

**Problem**: `shaders/block.vertex.glsl` and `shaders/block.fragment.glsl` are not formatted by Prettier.

**Impact**: Inconsistent formatting across the codebase.

**Remediation**: Add a Prettier plugin for GLSL or manually format the files.

---

## 7. Performance 🟡 Medium

### 7.1 Landscape Generation

**Location**: `worker/Operations/LandscapeOperation.ts`

**Problem**: Uses Perlin noise (`ImprovedNoise`) which is CPU-intensive. Runs on every terrain generation.

**Impact**: For large worlds, this becomes a major bottleneck.

**Remediation**:
1. Cache noise generation results
2. Use a more efficient noise algorithm (e.g., simplex noise)
3. Offload to a Web Worker (already done, but could use SIMD)

---

### 7.2 Cuboid Creation

**Location**: `worker/Operations/CuboidOperation.ts`

**Problem**: Creates blocks one by one in a loop — many small function calls.

**Impact**: Performance degradation for large cuboids.

**Remediation**:
1. Batch block creation (accumulate indices, set them all at once)
2. Use `Uint8Array.set()` for bulk assignment

---

### 7.3 Visibility Checks

**Location**: `app/WorldViewer.ts`

**Problem**: `getVisibleBlocks()` iterates through all blocks in a partition to determine visibility — O(n) per call. Called frequently during rendering.

**Impact**: Performance degradation for large partitions.

**Remediation**:
1. Cache visibility results and only recalculate when the camera moves significantly
2. Use spatial partitioning (octree, BVH) for faster visibility queries

---

## 8. Documentation 🟡 Low

### 8.1 Minimal JSDoc

**Problem**: Most files lack JSDoc comments. The only documented files are `WorkerInterface.ts` (line 12) and `MiniConsole.ts` (line 1).

**Impact**: Hard for new developers to understand the codebase.

**Remediation**:
1. Add JSDoc to all public methods
2. Add a README for each major module
3. Add a CHANGELOG for the project

---

### 8.2 No Architecture Decision Records (ADRs)

**Problem**: The `MODERNISATION_REPORT.md` documents what changed but not why.

**Impact**: Future developers don't understand the rationale behind architectural decisions.

**Remediation**:
1. Add ADRs for major decisions (e.g., why `Operation.ts` is a stub, why `Partition.ts` uses `Uint8Array`)
2. Document the intended architecture in a README

---

### 8.3 README Outdated

**Problem**: The README mentions `ws-cli` but doesn't explain how to run it.

**Impact**: New developers don't know how to use the CLI tool.

**Remediation**: Update the README with usage examples.

---

## Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| **P0** | ScriptRunner security (sandbox) | High | Security vulnerability |
| **P0** | ScriptStorage validation | Low | Security vulnerability |
| **P1** | Add test coverage (ScriptRunner, Partition, Player) | Medium | Reliability |
| **P1** | Add CI pipeline | Low | Reliability |
| **P1** | Implement `Operation.ts` or document as disabled | Low | Latent bug |
| **P2** | Replace `any` types with proper types | Medium | Type safety |
| **P2** | Fix memory leaks (interval refs, boundScripts) | Medium | Performance |
| **P2** | Optimize O(n³) block operations | Medium | Performance |
| **P2** | Add protocol versioning and acknowledgment | Medium | Reliability |
| **P3** | Extract `ToolState` shared between BlockTool/CuboidTool | Low | Maintainability |
| **P3** | Split `WorldViewer.ts` into focused managers | Medium | Maintainability |
| **P3** | Add lint-staged | Low | Code quality |
| **P3** | Add JSDoc to public methods | Low | Documentation |

---

## Recommended Remediation Plan

### Phase 1: Security (Immediate)
1. Split `Api` into `SafeApi` and `PowerApi`
2. Add timeout enforcement to `ScriptRunner`
3. Validate script content on load
4. Never allow overwriting sample scripts

### Phase 2: Testing (Critical)
1. Add unit tests for `ScriptRunner` (evaluate, error handling, retry)
2. Add unit tests for `Partition` (setBlock, getBlock, rangeCheck)
3. Add unit tests for `Player` (walk, setPosition, boundary checks)
4. Add unit tests for `UndoableCommand` (undo/redo)
5. Add integration tests for the worker protocol
6. Add CI pipeline

### Phase 3: Runtime (High)
1. Implement proper timer cleanup in `Api`
2. Optimize `Partition.setBlocks()` with batch operations
3. Cache visibility results in `WorldViewer`
4. Add retry logic with exponential backoff

### Phase 4: Architecture (Medium)
1. Implement `Operation.ts` or document as disabled
2. Extract `ToolState` shared between `BlockTool` and `CuboidTool`
3. Split `WorldViewer.ts` into focused managers
4. Add dependency injection

### Phase 5: Code Quality (Low)
1. Replace `any` types with proper types
2. Remove dead console statements
3. Add lint-staged
4. Add JSDoc to public methods
5. Update README

---

## Appendix: Quick Wins (Low Effort, High Impact)

1. **Add `lint-staged`** — run `yarn lint` and `yarn format` before each commit
2. **Remove dead `console.*` statements** — 15+ instances
3. **Add CI pipeline** — GitHub Actions with `yarn test:ui`
4. **Add `package.json` `scripts` for common tasks** — e.g., `scripts:test`, `scripts:build:watch`
5. **Format GLSL shaders** — add a Prettier plugin or manually format
