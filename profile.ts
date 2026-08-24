/// <reference path="./typings/index.d.ts" />
import { IntVector3, WorldInfo } from './common/WorldInfo';
import World from './worker/World';

const worldInfo = new WorldInfo({
  worldDimensionsInPartitions: new IntVector3(4, 1, 4),
  partitionDimensionsInBlocks: new IntVector3(256, 32, 256),
  partitionBoundaries: null
});

const world = new World(worldInfo);

console.time('init');
world.init();
console.timeEnd('init');

console.time('getVisibleBlocks');
world.getVisibleBlocks(5);
console.timeEnd('getVisibleBlocks');
