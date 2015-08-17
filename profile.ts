/// <reference path="./typings/tsd.d.ts" />

import THREE = require('three');

import com from './common/Common';
import World from './worker/World';

const worldInfo = new com.WorldInfo({
  worldDimensionsInPartitions: new THREE.Vector3(4, 1, 4),
  partitionDimensionsInBlocks: new THREE.Vector3(256, 32, 256),
  partitionBoundaries: null
});

const world = new World(worldInfo);

console.time('init');
world.init();
console.timeEnd('init');

console.time('getVisibleBlocks');
const result = world.getVisibleBlocks(5);
console.timeEnd('getVisibleBlocks');
