/**
 * Typed contracts for messages crossing the host ↔ geometry-worker boundary.
 *
 * postMessage structured-clones everything, so class identity does not
 * survive the trip: an IntVector3 arrives as a plain `{x, y, z}` object and
 * a WorldInfo arrives as a plain data object with no methods. The types
 * here describe the data as it crosses the boundary, not the classes that
 * send or receive it.
 */

import type { PartitionBoundaries } from './WorldInfo';
import type {
  AddBlockArgs,
  BoundScriptsChangeArgs,
  Movement,
  PlayerPositionChangeArgs,
  PlainVector3,
  SetBlocksArgs,
} from './Types';

/**
 * The worldInfo the worker's 'init' handler returns, as it arrives on the
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

// ======== Host → worker ========

export type WorkerRequest =
  | { id: number; action: 'init'; data: null }
  | { id: number; action: 'runScript'; data: { code: string; expr: boolean } }
  | { id: number; action: 'undo'; data: null }
  | { id: number; action: 'getPartition'; data: { index: number } }
  | { id: number; action: 'getBlock'; data: { pos: PlainVector3 } }
  | { id: number; action: 'setBlocks'; data: SetBlocksArgs }
  | { id: number; action: 'addBlock'; data: AddBlockArgs }
  | { id: number; action: 'move'; data: Movement }
  | { id: number; action: 'action'; data: { action: 'jump' } }
  | { id: number; action: 'setGravity'; data: { gravity: number } }
  | { id: number; action: 'getMousePosition'; data: null }
  | { id: number; action: 'setMousePosition'; data: { pos: PlainVector3; side: number } }
  | { id: number; action: 'rightClick'; data: null }
  | { id: number; action: 'executeBoundScript'; data: { index: number } };

/** The full request member for one action, including its id. */
export type RequestFor<Action extends WorkerRequest['action']> =
  Extract<WorkerRequest, { action: Action }>;

// ======== Worker → host ========

/**
 * A response to a request, correlated by id. The worker never type-checks
 * what it sends, so the payload is only trustworthy for the action that
 * produced it — the invoke() call site pins that mapping.
 */
export interface InvocationResponse {
  id: number;
  data: unknown;
}

/** Unsolicited events the worker pushes to the host. */
export type WorkerEvent =
  | { action: 'update'; changes: number[] }
  | { action: 'playerPositionChange'; data: PlayerPositionChangeArgs }
  | { action: 'boundScriptsChange'; data: BoundScriptsChangeArgs }
  | { action: 'print'; data: string };

export type WorkerMessage = InvocationResponse | WorkerEvent;
