/**
 * Typed contract for the host ↔ geometry-worker boundary.
 *
 * The two sides talk over comlink: the worker implements
 * {@link GeometryWorkerApi} and exposes it with `Comlink.expose()`, and the
 * host gets a typed proxy via `Comlink.wrap()`. Comlink rides on postMessage,
 * so structured cloning still strips class identity: an IntVector3 arrives
 * as a plain `{x, y, z}` object, and a WorldInfo arrives as a plain data
 * object with no methods. The types here describe the data as it crosses
 * the boundary, not the classes that send or receive it.
 *
 * The `on*` methods (onUpdate, onPlayerPositionChange, onBoundScriptsChange,
 * onPrint) are the worker → host event channel: the host passes a listener
 * wrapped with `Comlink.proxy()`, the worker stores the callable proxy, and
 * invokes it to push events back to the host.
 */

import type { PartitionBoundaries } from './WorldInfo';
import type {
  AddBlockArgs,
  BoundScriptsChangeListener,
  Movement,
  PlayerPositionChangeListener,
  PlainVector3,
  SetBlocksArgs,
} from './Types';

/**
 * The worldInfo the worker's init() resolves with, as it arrives on the
 * host: a structured clone of a WorldInfo instance — a plain data object
 * with WorldInfo's fields but none of its methods.
 */
export interface WorldInfoData {
  worldDimensionsInPartitions: PlainVector3;
  partitionDimensionsInBlocks: PlainVector3;
  worldDimensionsInBlocks: PlainVector3;
  partitionBoundaries: PartitionBoundaries[];
  partitionCapacity: number;
  worldCapacity: number;
  worldPartitionCapacity: number;
  WPX: number;
  WPY: number;
  WPZ: number;
  PBX: number;
  PBY: number;
  PBZ: number;
  WBX: number;
  WBY: number;
  WBZ: number;
}

/**
 * The per-vertex typed arrays of a partition's geometry.
 *
 * The buffers cross the boundary transferred (not cloned) — see the worker's
 * use of Comlink.transfer() — so on the host they are new, live buffers that
 * can be handed straight to three.js BufferAttributes.
 */
export interface VertexData {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  data: Float32Array;
  offset: Uint32Array;
}

/**
 * A partition's generated geometry as it arrives on the host. `offset` is
 * the partition origin in world coordinates — an IntVector3 on the worker,
 * plain `{x, y, z}` data here.
 */
export interface PartitionGeometryData {
  data: VertexData;
  offset: PlainVector3;
}

/** The response to getBlock(): the requested block's type (0 = air). */
export interface GetBlockResult {
  pos: PlainVector3;
  type: number;
}

/** The player's current aim: the block position and face under the mouse. */
export interface MousePosition {
  pos: PlainVector3;
  side: number;
}

/** The response to runScript(): the script's (stringified) result. */
export interface RunScriptResult {
  result: string;
}

/**
 * The full surface of the geometry worker, shared by both sides.
 *
 * - Host: `Comlink.wrap<GeometryWorkerApi>(worker)` yields a proxy whose
 *   methods are typed to return Promises of exactly these return types.
 * - Worker: `Comlink.expose()` takes an object implementing this interface;
 *   methods may be sync or async (comlink awaits), and a throw becomes a
 *   rejection of the host's promise.
 *
 * Return types describe the data after structured cloning, so they are
 * plain-data types (PlainVector3 & co), never the worker's classes.
 */
export interface GeometryWorkerApi {
  /**
   * Build the world, player, api and script runner, and start the tick
   * loop. Resolves with the world's info once the block geometry has
   * loaded. Only safe to call once.
   */
  init(): Promise<WorldInfoData>;

  /** Run a learner script (expression or statement form) against the api. */
  runScript(code: string, expr: boolean): RunScriptResult;

  /** Undo the last world change. */
  undo(): void;

  /** Generate (or regenerate) a partition's geometry. */
  getPartition(index: number): { index: number; geo: PartitionGeometryData };

  /** Read the block type at a world position (0 = air). */
  getBlock(pos: PlainVector3): GetBlockResult;

  /** Set a block range. */
  setBlocks(args: SetBlocksArgs): void;

  /** Add one block against a face of an existing block. */
  addBlock(args: AddBlockArgs): void;

  /** Continuous movement input; called repeatedly with the latest state. */
  move(movement: Movement): void;

  /** Jump (direction depends on the current gravity). */
  jump(): void;

  setGravity(gravity: number): void;

  /** The player's current aim, or null until the host reports a mouse move. */
  getMousePosition(): MousePosition | null;

  setMousePosition(position: MousePosition): void;

  /** Trigger the player's right-click action (edge-triggered). */
  rightClick(): void;

  /** Run the bound script for a digit key, if any. */
  executeBoundScript(index: number): void;

  // ---- Worker → host events (listeners arrive as Comlink.proxy() calls) ----

  /** Partition indices whose geometry changed, throttled to ~10/s. */
  onUpdate(listener: (changes: number[]) => void): void;

  /** Player position + look target, pushed at the worker's tick rate. */
  onPlayerPositionChange(listener: PlayerPositionChangeListener): void;

  /** The list of keys that currently have a bound script. */
  onBoundScriptsChange(listener: BoundScriptsChangeListener): void;

  /** Console output from learner scripts (print()). */
  onPrint(listener: (message: string) => void): void;
}
