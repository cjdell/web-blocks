/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../common/WorldInfo';

export default class WorkerInterface {
  geoWorker: Worker;
  callbacks: { [id: number]: Function } = {};

  changeListener: Function = null;
  lastId = 0;

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

  undo() {
    return this.invoke<Object>('undo', null);
  }

  getBlock(pos: THREE.Vector3) {
    return this.invoke<Object>('getBlock', { pos: pos })
      .then(function(result: any) {
        return <number>result.type;
      });
  }

  setBlocks(start: com.IntVector3, end: com.IntVector3, type: number, colour: number, update: boolean) {
    return this.invoke<Object>('setBlocks', {
      start: start,
      end: end,
      type: type,
      colour: colour,
      update: update
    });
  }

  addBlock(position: com.IntVector3, side: number, type: number) {
    this.geoWorker.postMessage({
      action: 'addBlock',
      position: position,
      side: side,
      type: type
    });
  }

  getPartition(index: number) {
    return this.invoke<Object>('getPartition', { index: index });
  }

  registerChangeHandler(changeHandlerOptions: com.ChangeHandlerOptions, callback: (Change: any) => void) {
    return this.invokeCallback<Object>('registerChangeHandler', changeHandlerOptions, callback);
  }

  addChangeListener(listener: (data: any) => void) {
    this.changeListener = listener;
  }
}
