/// <reference path="../typings/index.d.ts" />
import * as THREE from 'three';
import type { WorldInfo, IntVector3, ChangeHandlerOptions } from '../common/WorldInfo';
import { PartitionGeometryResult }  from '../worker/WorldGeometry';

import {
  Movement,
  AddBlockArgs,
  SetBlocksArgs,
  PlayerPositionChangeListener,
  BoundScriptsChangeListener
} from '../common/Types';

export default class WorkerInterface {
  geoWorker: Worker;
  callbacks: { [id: number]: (data: any) => void } = {};

  changeListener: (data: { changes: number[] }) => void = null;
  print: (msg: string) => void = null;
  lastId = 0;
  jumping: boolean = false;

  private playerPositionChangeListener: PlayerPositionChangeListener;
  private boundScriptsChangeListener: BoundScriptsChangeListener;

  constructor() {
    this.geoWorker = new Worker('build/worker.js');

    this.geoWorker.onmessage = e => {
      if (typeof e.data.id === 'number') {
        const callback = this.callbacks[e.data.id];

        delete this.callbacks[e.data.id];

        return callback(e.data.data);
      }

      if (e.data.action === 'update') {
        if (this.changeListener) {
          this.changeListener(e.data);
        }
      }

      if (e.data.action === 'playerPositionChange') {
        if (this.playerPositionChangeListener) {
          this.playerPositionChangeListener(e.data.data);
        }
      }

      if (e.data.action === 'boundScriptsChange') {
        if (this.boundScriptsChangeListener) {
          this.boundScriptsChangeListener(e.data.data);
        }
      }

      if (e.data.action === 'print') {
        if (this.print) {
          this.print(e.data.data);
        }
      }
    };
  }

  invoke<ReturnType>(action: string, data: object) {
    // Note: the worker has no error path, so the promise can never reject.
    return new Promise<ReturnType>((resolve, _reject) => {
      const invocation = {
        action: action,
        id: this.lastId++,
        data: data
      };

      this.callbacks[invocation.id] = resolve;

      this.geoWorker.postMessage(invocation);
    });
  }

  invokeCallback<ReturnType>(action: string, data: object, callback: (r: ReturnType) => void) {
    const invocation = {
      action: action,
      id: this.lastId++,
      data: data
    };

    this.callbacks[invocation.id] = callback;

    this.geoWorker.postMessage(invocation);
  }

  init() {
    return this.invoke<WorldInfo>('init', null);
  }

  runScript(code: string, expr: boolean) {
    return this.invoke<{ result: any }>('runScript', { code, expr });
  }

  undo() {
    return this.invoke<void>('undo', null);
  }

  getBlock(pos: THREE.Vector3) {
    return this.invoke<{ type: number }>('getBlock', { pos: pos }).then((result) => {
      return result.type;
    });
  }

  setBlocks(
    start: IntVector3,
    end: IntVector3,
    type: number,
    colour: number,
    update: boolean
  ) {
    const args: SetBlocksArgs = {
      start,
      end,
      type,
      colour,
      update
    };

    return this.invoke<object>('setBlocks', args);
  }

  addBlock(position: IntVector3, side: number, type: number) {
    const args: AddBlockArgs = {
      position,
      side,
      type
    };

    return this.invoke<object>('addBlock', args);
  }

  move(movement: Movement) {
    return this.invoke<object>('move', movement);
  }

  jump() {
    this.jumping = true;
    return this.invoke<object>('action', { action: 'jump' });
  }

  setGravity(gravity: number) {
    return this.invoke<object>('setGravity', { gravity });
  }

  getPartition(index: number) {
    return this.invoke<{ geo: PartitionGeometryResult }>('getPartition', { index });
  }

  registerChangeHandler(changeHandlerOptions: ChangeHandlerOptions, callback: (Change: any) => void) {
    return this.invokeCallback<object>('registerChangeHandler', changeHandlerOptions, callback);
  }

  addChangeListener(listener: (data: { changes: number[] }) => void) {
    this.changeListener = listener;
  }

  rightClick() {
    return this.invoke<object>('rightClick', null);
  }

  getMousePosition() {
    return this.invoke<object>('getMousePosition', null);
  }

  setMousePosition(position: { pos: IntVector3, side: number }) {
    return this.invoke<object>('setMousePosition', position);
  }

  executeBoundScript(index: number) {
    this.invoke<object>('executeBoundScript', { index });
  }

  onPlayerPositionChange(listener: PlayerPositionChangeListener) {
    this.playerPositionChangeListener = listener;
  }

  onBoundScriptsChange(listener: BoundScriptsChangeListener) {
    this.boundScriptsChangeListener = listener;
  }
}
