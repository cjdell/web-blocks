/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

module WorkerInterface {
  export interface WorkerInterface {
    init(): Promise<Object>;
    undo(): Promise<Object>;
    getBlock(pos: THREE.Vector3): Promise<number>;
    setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number, colour: number, update: boolean): Promise<Object>;
    getPartition(index: number): Promise<Object>;
    addChangeListener(listener: Function): void;
  }

  export function NewWorkerInterface(): WorkerInterface {
    let geoWorker = new Worker('build/worker.js');

    let callbacks: { [id: number]: Function } = {};
    let changeListener: Function = null;
    let lastId = 0;

    function invoke<ReturnType>(action: string, data: Object) {
      return new Promise<ReturnType>(function(resolve, reject) {
        let invocation = {
          action: action,
          id: lastId++,
          data: data
        };

        callbacks[invocation.id] = resolve;

        geoWorker.postMessage(invocation);
      });
    }

    function init() {
      return invoke<Object>('init', null);
    }

    function undo() {
      return invoke<Object>('undo', null);
    }

    function getBlock(pos: THREE.Vector3) {
      return invoke<Object>('getBlock', { pos: pos })
        .then(function(result: any) {
        return <number>result.type;
      });
    }

    function setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number, colour: number, update: boolean) {
      return invoke<Object>('setBlocks', {
        start: start,
        end: end,
        type: type,
        colour: colour,
        update: update
      });
    }

    function addBlock(position: THREE.Vector3, side: number, type: number) {
      geoWorker.postMessage({
        action: 'addBlock',
        position: position,
        side: side,
        type: type
      });
    }

    function getPartition(index: number) {
      return invoke<Object>('getPartition', { index: index });
    }

    geoWorker.onmessage = function(e) {
      if (typeof e.data.id === 'number') {
        return callbacks[e.data.id](e.data.data);
      }

      if (e.data.action === 'update') {
        if (changeListener) changeListener(e.data);
      }
    };

    function addChangeListener(listener: Function) {
      changeListener = listener;
    }

    return {
      init: init,
      undo: undo,
      getBlock: getBlock,
      setBlocks: setBlocks,
      addBlock: addBlock,
      getPartition: getPartition,
      addChangeListener: addChangeListener
    };
  }
}

export default WorkerInterface;
