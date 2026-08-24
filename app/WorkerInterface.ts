import * as Comlink from 'comlink';

import type {
  GeometryWorkerApi,
  MousePosition,
  PartitionGeometryData,
  RunScriptResult,
  WorldInfoData,
} from '../common/WorkerProtocol';
import type {
  AddBlockArgs,
  BoundScriptsChangeListener,
  Movement,
  PlayerPositionChangeListener,
  PlainVector3,
  SetBlocksArgs,
} from '../common/Types';

/**
 * Typed facade over the geometry worker.
 *
 * All RPC goes through a comlink proxy: Comlink.wrap() hands back a proxy
 * typed as Remote<GeometryWorkerApi>, so every call is checked end-to-end
 * against the same shared interface the worker implements (the worker's
 * implementation is compiled against it too). Method calls resolve with the
 * worker's return value — or reject if the worker throws — and the worker →
 * host events (update / playerPositionChange / boundScriptsChange / print)
 * are delivered to listeners registered with Comlink.proxy(), which the
 * worker invokes as callable proxies.
 */
export default class WorkerInterface {
  private worker: Worker;
  private api: Comlink.Remote<GeometryWorkerApi>;

  // Host-side state for the jump edge: the worker only sees discrete jump()
  // requests, so key repeat is suppressed here.
  jumping = false;

  private printListener: ((message: string) => void) | null = null;

  constructor() {
    this.worker = new Worker('build/worker.js');
    this.api = Comlink.wrap(this.worker);
  }

  // ---- RPC (host → worker) ----

  init(): Promise<WorldInfoData> {
    return this.api.init();
  }

  runScript(code: string, expr: boolean): Promise<RunScriptResult> {
    return this.api.runScript(code, expr);
  }

  undo(): Promise<void> {
    return this.api.undo();
  }

  getPartition(index: number): Promise<{ index: number; geo: PartitionGeometryData }> {
    return this.api.getPartition(index);
  }

  getBlock(pos: PlainVector3): Promise<number> {
    return this.api.getBlock(pos).then((result) => result.type);
  }

  setBlocks(
    start: PlainVector3,
    end: PlainVector3,
    type: number,
    colour: number,
    update: boolean,
  ): Promise<void> {
    const args: SetBlocksArgs = {
      start,
      end,
      type,
      colour,
      update,
    };

    return this.api.setBlocks(args);
  }

  addBlock(position: PlainVector3, side: number, type: number): Promise<void> {
    const args: AddBlockArgs = {
      position,
      side,
      type,
    };

    return this.api.addBlock(args);
  }

  move(movement: Movement): Promise<void> {
    return this.api.move(movement);
  }

  jump(): Promise<void> {
    this.jumping = true;
    return this.api.jump();
  }

  setGravity(gravity: number): Promise<void> {
    return this.api.setGravity(gravity);
  }

  getMousePosition(): Promise<MousePosition | null> {
    return this.api.getMousePosition();
  }

  setMousePosition(position: MousePosition): Promise<void> {
    return this.api.setMousePosition(position);
  }

  rightClick(): Promise<void> {
    return this.api.rightClick();
  }

  executeBoundScript(index: number): Promise<void> {
    return this.api.executeBoundScript(index);
  }

  // ---- Worker → host events ----
  //
  // Listeners are wrapped in Comlink.proxy() so the worker receives a
  // callable proxy (a plain function would be dropped by structured
  // cloning); the worker invokes it to push events back here.

  addChangeListener(listener: (changes: number[]) => void): void {
    void this.api.onUpdate(Comlink.proxy(listener));
  }

  onPlayerPositionChange(listener: PlayerPositionChangeListener): void {
    void this.api.onPlayerPositionChange(Comlink.proxy(listener));
  }

  onBoundScriptsChange(listener: BoundScriptsChangeListener): void {
    void this.api.onBoundScriptsChange(Comlink.proxy(listener));
  }

  get print(): ((message: string) => void) | null {
    return this.printListener;
  }

  set print(listener: ((message: string) => void) | null) {
    this.printListener = listener;

    if (listener) {
      void this.api.onPrint(Comlink.proxy(listener));
    }
  }
}
