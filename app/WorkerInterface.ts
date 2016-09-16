"use strict";
/// <reference path="../typings/index.d.ts" />
import THREE = require('three');

import com from '../common/WorldInfo';
import { Movement, SetBlockArgs, SetBlocksArgs } from '../common/Types';
import { PartitionGeometryResult } from '../worker/WorldGeometry';

export default class WorkerInterface {
  geoWorker: Worker;
  callbacks: { [id: number]: Function } = {};

  changeListener: (data: { changes: number[] }) => void = null;
  print: Function = null;
  playerPositionListener: ((position: THREE.Vector3) => void);
  lastId = 0;
  jumping: boolean = false;

  constructor() {
    this.geoWorker = new Worker('build/worker.js');

    this.geoWorker.onmessage = e => {
      if (typeof e.data.id === 'number') {
        const callback = this.callbacks[e.data.id];

        delete this.callbacks[e.data.id];

        return callback(e.data.data);
      }

      if (e.data.action === 'update') {
        if (this.changeListener) this.changeListener(e.data);
      }

      if (e.data.action === 'updatePlayerPosition') {
        if (this.playerPositionListener) this.playerPositionListener(e.data.data);
      }

      if (e.data.action === 'print') {
        if (this.print) this.print(e.data.data);
      }
    };
  }

  invoke<ReturnType>(action: string, data: Object) {
    return new Promise<ReturnType>((resolve, reject) => {
      const invocation = {
        action: action,
        id: this.lastId++,
        data: data
      };

      this.callbacks[invocation.id] = resolve;

      this.geoWorker.postMessage(invocation);
    });
  }

  invokeCallback<ReturnType>(action: string, data: Object, callback: (r: ReturnType) => void) {
    const invocation = {
      action: action,
      id: this.lastId++,
      data: data
    };

    this.callbacks[invocation.id] = callback;

    this.geoWorker.postMessage(invocation);
  }

  init() {
    return this.invoke<com.WorldInfo>('init', null);
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

  setBlocks(start: com.IntVector3, end: com.IntVector3, type: number, colour: number, update: boolean) {
    const args: SetBlocksArgs = {
      start,
      end,
      type,
      colour,
      update
    };

    return this.invoke<Object>('setBlocks', args);
  }

  addBlock(position: com.IntVector3, side: number, type: number) {
    const args: SetBlockArgs = {
      position,
      side,
      type
    };

    return this.invoke<Object>('addBlock', args);
  }

  move(movement: Movement) {
    return this.invoke<Object>('move', movement);
  }

  jump() {
    this.jumping = true;
    return this.invoke<Object>('action', { action: 'jump' });
  }

  setGravity(gravity: number) {
    return this.invoke<Object>('setGravity', { gravity });
  }

  getPartition(index: number) {
    return this.invoke<{ geo: PartitionGeometryResult }>('getPartition', { index });
  }

  registerChangeHandler(changeHandlerOptions: com.ChangeHandlerOptions, callback: (Change: any) => void) {
    return this.invokeCallback<Object>('registerChangeHandler', changeHandlerOptions, callback);
  }

  addChangeListener(listener: (data: { changes: number[] }) => void) {
    this.changeListener = listener;
  }

  rightClick() {
    return this.invoke<Object>('rightClick', null);
  }

  getMousePosition() {
    return this.invoke<Object>('getMousePosition', null);
  }

  setMousePosition(position: { pos: com.IntVector3, side: number }) {
    return this.invoke<Object>('setMousePosition', position);
  }

  executeBoundScript(index: number) {
    this.invoke<Object>('executeBoundScript', { index });
  }
}
