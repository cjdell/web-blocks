import THREE = require('three');
import com from '../common/WorldInfo';
import { BlockTypeIds }  from '../common/BlockTypeList';
import World from './World';
import Player from './Player';

export default class Api {
  world: World;
  player: Player;

  get BlockType() {
    return BlockTypeIds;
  };

  intervalRefs = <number[]>[];
  timeoutRefs = <number[]>[];

  constructor(world: World, player: Player) {
    this.world = world;
    this.player = player;
  }

  resetPlayer() {
    this.player.resetPlayer();
  }

  undo(times = 1) {
    for (let i = 0; i < times; i += 1) {
      this.world.undo();
    }
  }

  get help() {
    return [
      'Here you can type JavaScript commands!',
      'Not sure what to type? Here\'s some you can try:',
      '  setPosition(100,12,110)',
      '  setBlock(100,5,100,BlockType.Grass)',
      '  setBlock(100,5,100,BlockType.Colour,100)',
      '  setBlocks(100,5,100,100,20,100,BlockType.Stone)',
      'To see more awesome commands, click the "Script" tab and load a sample program! :-)'
    ].join('\n');
  }

  get hi() {
    return 'Hi there!';
  }

  print(msg: any) {
    if (msg instanceof Array) msg = JSON.stringify(msg);

    if (msg instanceof Object || typeof (msg) === "object") {
      if (typeof (msg) === "undefined") {
        return;
      } else if (msg === null || msg.toString && msg.toString() === "[object Object]") {
        msg = JSON.stringify(msg);
      }
    }

    if (msg && msg.toString) msg = msg.toString();

    if (typeof (msg) !== "string") msg = "Error: unable to print.";

    this.player.print(msg);
  }

  bindRightClick(fn: Function) {
    this.player.rightClick = fn;
  }

  bindScript(fn: () => void, key: number) {
    this.player.addBoundScript(key, fn);
  }

  setGravity(gravity: number) {
    this.player.gravity = gravity;
  }

  getMousePosition(): { pos: com.IntVector3, side: number } {
    return this.player.mousePosition;
  }

  setBlock(
    x: number, y: number, z: number,
    type: number, colour: number
  ): void {
    this.world.setBlocks(x, y, z, x, y, z, type, colour);
  }

  setBlocks(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    type: number, colour: number
  ): void {
    this.world.setBlocks(x1, y1, z1, x2, y2, z2, type, colour);
  }

  getBlock(x: number, y: number, z: number): number {
    return this.world.getBlock(x, y, z);
  }

  getPosition(): THREE.Vector3 {
    return this.player.getPosition();
  }

  setPosition(x: number, y: number, z: number): void {
    this.player.setPosition(new THREE.Vector3(x, y, z));
  }

  getDirection(): THREE.Vector2 {
    return this.player.getDirection();
  }

  setDirection(x: number, y: number): void {
    this.player.setDirection(new THREE.Vector2(x, y));
  }

  setInterval(func: Function, interval: number): void {
    const ref = self.setInterval(func, interval);
    this.intervalRefs.push(ref);
  }

  clearIntervals(): void {
    this.intervalRefs.forEach(self.clearInterval);
    this.intervalRefs.length = 0;
  }

  setTimeout(func: Function, timeout: number): void {
    const ref = self.setTimeout(func, timeout);
    this.timeoutRefs.push(ref);
  }

  clearTimeouts(): void {
    this.timeoutRefs.forEach(self.clearTimeout);
    this.timeoutRefs.length = 0;
  }
}

Object.keys(BlockTypeIds).forEach(blockTypeName => {
  Api.prototype[blockTypeName] = BlockTypeIds[blockTypeName];
});
