// import THREE = require('three');
//
// import com from '../common/WorldInfo';
// import WorkerInterface from './WorkerInterface';
//
// export default class Api {
//   workerInterface: WorkerInterface;
//   viewPoint: any;
//
//   help = [
//     'Here you can type JavaScript commands!',
//     'Not sure what to type? Here\'s some you can try:',
//     '  setPosition(100,12,110)',
//     '  setBlock(100,10,100,1)',
//     '  setBlocks(100,10,100,100,20,100,1)',
//     'To see more awesome commands, click the "Script" tab and load a sample program! :-)'
//   ].join('\n');
//
//   hi = 'Hi there!';
//
//   intervalRefs = <number[]>[];
//
//   constructor(workerInterface: WorkerInterface, viewPoint: any) {
//     this.workerInterface = workerInterface;
//     this.viewPoint = viewPoint;
//   }
//
//   runScript(code: string, expr: boolean) {
//     return this.workerInterface.runScript(code, expr);
//   }
//
//   setBlock(x: number, y: number, z: number, type: number, colour: number): void {
//     this.workerInterface.setBlocks(new com.IntVector3(x | 0, y | 0, z | 0), new com.IntVector3(x | 0, y | 0, z | 0), type, colour, true);
//   }
//
//   setBlocks(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, type: number, colour: number): void {
//     this.workerInterface.setBlocks(new com.IntVector3(x1 | 0, y1 | 0, z1 | 0), new com.IntVector3(x2 | 0, y2 | 0, z2 | 0), type, colour, true);
//   }
//
//   getBlock(x: number, y: number, z: number): Promise<number> {
//     return this.workerInterface.getBlock(new THREE.Vector3(x | 0, y | 0, z | 0));
//   }
//
//   getPosition(): THREE.Vector3 {
//     return this.viewPoint.getPosition();
//   }
//
//   setPosition(x: number, y: number, z: number): void {
//     this.viewPoint.setPosition(new THREE.Vector3(x, y, z));
//   }
//
//   getTarget(): any {
//     return this.viewPoint.getTarget();
//   }
//
//   setTarget(lon: number, lat: number): void {
//     this.viewPoint.setTarget({ lon: lon, lat: lat });
//   }
//
//   setInterval(func: Function, interval: number): void {
//     const ref = self.setInterval(func, interval);
//     this.intervalRefs.push(ref);
//   }
//
//   clearIntervals(): void {
//     this.intervalRefs.forEach(self.clearInterval);
//     this.intervalRefs.length = 0;
//   }
// }
