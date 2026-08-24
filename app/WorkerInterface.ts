import type {
  RequestFor,
  WorkerMessage,
  WorkerRequest,
  WorldInfoData
} from '../common/WorkerProtocol';

import type {
  AddBlockArgs,
  BoundScriptsChangeListener,
  Movement,
  PlayerPositionChangeListener,
  PlainVector3,
  SetBlocksArgs
} from '../common/Types';

import type { ChangeHandlerOptions } from '../common/WorldInfo';
import type { PartitionGeometryResult } from '../worker/WorldGeometry';

export default class WorkerInterface {
  geoWorker: Worker;
  callbacks: { [id: number]: (data: unknown) => void } = {};

  changeListener: ((data: { changes: number[] }) => void) | null = null;
  print: ((msg: string) => void) | null = null;
  lastId = 0;
  jumping: boolean = false;

  // Set lazily via onPlayerPositionChange()/onBoundScriptsChange(); both
  // are checked before use.
  private playerPositionChangeListener: PlayerPositionChangeListener | null = null;
  private boundScriptsChangeListener: BoundScriptsChangeListener | null = null;

  constructor() {
    this.geoWorker = new Worker('build/worker.js');

    this.geoWorker.onmessage = e => {
      const message = e.data as WorkerMessage;

      // Responses carry a request id; events don't.
      if ('id' in message) {
        const callback = this.callbacks[message.id];

        delete this.callbacks[message.id];

        if (callback) callback(message.data);

        return;
      }

      switch (message.action) {
        case 'update':
          if (this.changeListener) {
            this.changeListener(message);
          }
          break;

        case 'playerPositionChange':
          if (this.playerPositionChangeListener) {
            this.playerPositionChangeListener(message.data);
          }
          break;

        case 'boundScriptsChange':
          if (this.boundScriptsChangeListener) {
            this.boundScriptsChangeListener(message.data);
          }
          break;

        case 'print':
          if (this.print) {
            this.print(message.data);
          }
          break;
      }
    };
  }

  /**
   * Send a request to the worker and await its response.
   *
   * The action pins the payload type (via the WorkerRequest union) and the
   * generic pins the response type at the call site. Note: the worker has
   * no error path, so the promise can never reject — and the worker never
   * type-checks its own responses, so the data is only as trustworthy as
   * the pairing declared at the call site.
   */
  invoke<ReturnType, Action extends WorkerRequest['action']>(
    action: Action,
    data: RequestFor<Action>['data']
  ): Promise<ReturnType> {
    return new Promise<ReturnType>(resolve => {
      const id = this.lastId++;

      this.callbacks[id] = data => resolve(data as ReturnType);

      this.geoWorker.postMessage({ id, action, data });
    });
  }

  /**
   * Fire-and-forget variant of invoke() for actions whose response is not
   * typed in the WorkerRequest union. (Currently only used by
   * registerChangeHandler, which the worker does not implement yet.)
   */
  invokeCallback<ReturnType>(action: string, data: object, callback: (r: ReturnType) => void) {
    const id = this.lastId++;

    this.callbacks[id] = data => callback(data as ReturnType);

    this.geoWorker.postMessage({ id, action, data });
  }

  init(): Promise<WorldInfoData> {
    return this.invoke<WorldInfoData, 'init'>('init', null);
  }

  runScript(code: string, expr: boolean): Promise<{ result: unknown }> {
    return this.invoke('runScript', { code, expr });
  }

  undo(): Promise<void> {
    return this.invoke('undo', null);
  }

  getBlock(pos: PlainVector3): Promise<number> {
    return this.invoke<{ type: number }, 'getBlock'>('getBlock', { pos }).then(result => {
      return result.type;
    });
  }

  setBlocks(
    start: PlainVector3,
    end: PlainVector3,
    type: number,
    colour: number,
    update: boolean
  ): Promise<unknown> {
    const args: SetBlocksArgs = {
      start,
      end,
      type,
      colour,
      update
    };

    return this.invoke('setBlocks', args);
  }

  addBlock(position: PlainVector3, side: number, type: number): Promise<unknown> {
    const args: AddBlockArgs = {
      position,
      side,
      type
    };

    return this.invoke('addBlock', args);
  }

  move(movement: Movement): Promise<unknown> {
    return this.invoke('move', movement);
  }

  jump(): Promise<unknown> {
    this.jumping = true;
    return this.invoke('action', { action: 'jump' });
  }

  setGravity(gravity: number): Promise<unknown> {
    return this.invoke('setGravity', { gravity });
  }

  getPartition(index: number): Promise<{ index: number; geo: PartitionGeometryResult }> {
    return this.invoke('getPartition', { index });
  }

  registerChangeHandler(changeHandlerOptions: ChangeHandlerOptions, callback: (change: unknown) => void) {
    return this.invokeCallback<unknown>('registerChangeHandler', changeHandlerOptions, callback);
  }

  addChangeListener(listener: (data: { changes: number[] }) => void) {
    this.changeListener = listener;
  }

  rightClick(): Promise<unknown> {
    return this.invoke('rightClick', null);
  }

  getMousePosition(): Promise<unknown> {
    return this.invoke('getMousePosition', null);
  }

  setMousePosition(position: { pos: PlainVector3; side: number }): Promise<unknown> {
    return this.invoke('setMousePosition', position);
  }

  executeBoundScript(index: number) {
    this.invoke('executeBoundScript', { index });
  }

  onPlayerPositionChange(listener: PlayerPositionChangeListener) {
    this.playerPositionChangeListener = listener;
  }

  onBoundScriptsChange(listener: BoundScriptsChangeListener) {
    this.boundScriptsChangeListener = listener;
  }
}
