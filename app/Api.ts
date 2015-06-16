import THREE = require('three');

import wi from './WorkerInterface';

module Api {
  export interface Api {

  }

  export function NewApi(workerInterface: wi.WorkerInterface, viewPoint: any): Api {
    let help = [
      'Here you can type JavaScript commands!',
      'Not sure what to type? Here\'s some you can try:',
      '  setPosition(100,12,110)',
      '  setBlock(100,10,100,1)',
      '  setBlocks(100,10,100,100,20,100,1)',
      'To see more awesome commands, click the "Script" tab and load a sample program! :-)'
    ].join('\n');

    let hi = 'Hi there!';

    let intervalRefs = <number[]>[];

    function setBlock(x: number, y: number, z: number, type: number, colour: number): void {
      workerInterface.setBlocks(new THREE.Vector3(x | 0, y | 0, z | 0), new THREE.Vector3(x | 0, y | 0, z | 0), type, colour, true);
    }

    function setBlocks(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, type: number, colour: number): void {
      workerInterface.setBlocks(new THREE.Vector3(x1 | 0, y1 | 0, z1 | 0), new THREE.Vector3(x2 | 0, y2 | 0, z2 | 0), type, colour, true);
    }

    function getBlock(x: number, y: number, z: number): Promise<number> {
      return workerInterface.getBlock(new THREE.Vector3(x | 0, y | 0, z | 0));
    }

    function getPosition(): THREE.Vector3 {
      return viewPoint.getPosition();
    }

    function setPosition(x: number, y: number, z: number): void {
      viewPoint.setPosition(new THREE.Vector3(x, y, z));
    }

    function getTarget(): any {
      return viewPoint.getTarget();
    }

    function setTarget(lon: number, lat: number): void {
      viewPoint.setTarget({ lon: lon, lat: lat });
    }

    function setInterval(func: Function, interval: number): void {
      let ref = self.setInterval(func, interval);
      intervalRefs.push(ref);
    }

    function clearIntervals(): void {
      intervalRefs.forEach(self.clearInterval);
      intervalRefs = [];
    }

    return {
      help: help,
      hi: hi,
      setBlock: setBlock,
      setBlocks: setBlocks,
      getBlock: getBlock,
      getPosition: getPosition,
      setPosition: setPosition,
      getTarget: getTarget,
      setTarget: setTarget,
      setInterval: setInterval,
      clearIntervals: clearIntervals
    };
  }
}

export default Api;
