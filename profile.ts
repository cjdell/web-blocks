/// <reference path="./typings/index.d.ts" />
import THREE = require('three');
import com from './common/WorldInfo';
import World from './worker/World';

const worldInfo = new com.WorldInfo({
  worldDimensionsInPartitions: new com.IntVector3(4, 1, 4),
  partitionDimensionsInBlocks: new com.IntVector3(256, 32, 256),
  partitionBoundaries: null
});

const world = new World(worldInfo);

console.time('init');
world.init();
console.timeEnd('init');

console.time('getVisibleBlocks');
const result = world.getVisibleBlocks(5);
console.timeEnd('getVisibleBlocks');
