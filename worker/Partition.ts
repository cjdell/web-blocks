/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import noise from './ImprovedNoise';

module Partition {
  export interface Partition {
    initIfRequired(): void;
    setRandomHeight(height: number): void;
    getBlock(position: THREE.Vector3): Uint8Array;
    setBlock(position: THREE.Vector3, type: number, colour: number): void;
    getVisibleBlocks(): VisibleBlocksResult;
    isDirty(): boolean;

    index: number;
    dimensions: THREE.Vector3;
    offset: THREE.Vector3;
  }

  export interface VisibleBlocksResult {
    blocks: Int32Array;
    maxId: number;
  }

  export function NewPartition(dimensions: THREE.Vector3, partitionPosition: THREE.Vector3, worldDimensions: THREE.Vector3, partitionIndex: number): Partition {
    var capacity = dimensions.x * dimensions.y * dimensions.z;
    var offset = new THREE.Vector3(partitionPosition.x * dimensions.x, partitionPosition.y * dimensions.y, partitionPosition.z * dimensions.z);
    var blocks: Uint8Array = null;
    var dirty = false;
    var occupied = 0;   // Total of everything that isn't air

    const VALUES_PER_BLOCK = 2;

    function initIfRequired(): void {
      if (blocks === null) {
        blocks = new Uint8Array(capacity * 2);
      }
    }

    function getBlock(position: THREE.Vector3): Uint8Array {
      var index = getIndex(position.x, position.y, position.z);

      return new Uint8Array([blocks[VALUES_PER_BLOCK * index]]);
    }

    function setBlockWithIndex(index: number, type: number, colour: number): void {
      var offset = VALUES_PER_BLOCK * index;

      var currentType = blocks[offset + 0];

      if (currentType === type) return;

      blocks[offset + 0] = type;
      blocks[offset + 1] = colour | 0;

      if (currentType === 0)
        occupied += 1;
      else if (type === 0)
        occupied -= 1;

      dirty = true;
    }

    function setBlock(position: THREE.Vector3, type: number, colour: number): void {
      if (position.x < 0 || position.y < 0 || position.z < 0) return;
      if (position.x >= dimensions.x || position.y >= dimensions.y || position.z >= dimensions.z) return;

      setBlockWithIndex(getIndex(position.x, position.y, position.z), type, colour);
    }

    function setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number): void {
      for (var z = start.z; z <= end.z; z++) {
        for (var y = start.y; y <= end.y; y++) {
          var index = getIndex(start.x, y, z);
          for (var x = start.x; x <= end.x; x++, index++) {
            setBlockWithIndex(index, type, 0);
          }
        }
      }
    }

    function getIndex(x: number, y: number, z: number): number {
      return x + dimensions.x * (y + dimensions.y * z);
    }

    function getPositionFromIndex(index: number) {
      var z = Math.floor(index / (dimensions.x * dimensions.y));
      var y = Math.floor((index - z * dimensions.x * dimensions.y) / dimensions.x);
      var x = index - dimensions.x * (y + dimensions.y * z);

      return new THREE.Vector3(x, y, z);
    }

    function canBlockBeSeen(index: number): boolean {
      var pos = getPositionFromIndex(index);

      if (pos.x === 0 || pos.y === 0 || pos.z === 0) return true;
      if (pos.x === dimensions.x - 1 || pos.y === dimensions.y - 1 || pos.z === dimensions.z - 1) return true;

      var xdi = index - 1;
      var xui = index + 1;

      var ydi = index - dimensions.x;
      var yui = index + dimensions.x;

      var zdi = index - (dimensions.x * dimensions.y);
      var zui = index + (dimensions.x * dimensions.y);

      var xd = blocks[VALUES_PER_BLOCK * xdi];
      var xu = blocks[VALUES_PER_BLOCK * xui];

      var yd = blocks[VALUES_PER_BLOCK * ydi];
      var yu = blocks[VALUES_PER_BLOCK * yui];

      var zd = blocks[VALUES_PER_BLOCK * zdi];
      var zu = blocks[VALUES_PER_BLOCK * zui];

      return !(xd && xu && yd && yu && zd && zu);
    }

    function getWorldIndexFromWorldPosition(x: number, y: number, z: number) {
      return x + (worldDimensions.x * dimensions.x) * (y + (worldDimensions.y * dimensions.y) * z);
    }

    function getBlockIndexInWorld(blockIndex: number): number {
      var position = getPositionFromIndex(blockIndex);

      position.x += offset.x;
      position.y += offset.y;
      position.z += offset.z;

      return getWorldIndexFromWorldPosition(position.x, position.y, position.z);
    }

    function setRandomHeight(h: number): void {
      var width = dimensions.x, height = dimensions.z;

      var data = <number[]>[];
      var perlin = noise.NewImprovedNoise();
      var size = width * height;
      var quality = 1;
      //var h = Math.random() * dimensions.y;

      for (var j = 0; j < 4; j++) {
        if (j == 0) for (var i = 0; i < size; i++) data[i] = 0;

        let index = 0;

        for (let x = offset.x; x < offset.x + width; x++) {
          for (let z = offset.z; z < offset.z + height; z++, index++) {
            data[index] += perlin.noise(x / quality, z / quality, h) * quality;
          }
        }

        quality *= 4;
      }

      var index2 = 0;

      for (let x = 0; x < width; x++) {
        for (let z = 0; z < height; z++, index2++) {
          var y2 = Math.min(Math.abs(data[index2] * 0.2), dimensions.y) | 0;

          if (y2 >= 1) {
            setBlocks(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, y2, z), 2);
          } else {
            setBlocks(new THREE.Vector3(x, 1, z), new THREE.Vector3(x, 1, z), 3);
          }
        }
      }
    }

    function isDirty(): boolean {
      return dirty;
    }

    function getVisibleBlocks(): VisibleBlocksResult {
      var valuesPerBlock = 6;

      updateHeightMap();

      var id = 0;
      var changes = new Int32Array(occupied * valuesPerBlock);

      for (var index = 0; index < capacity; index++) {
        var offset = VALUES_PER_BLOCK * index;

        var type = blocks[offset + 0];
        var colour = blocks[offset + 1];

        if (type !== 0 && canBlockBeSeen(index)) {
          var pos = getPositionFromIndex(index);

          var shade = computeOcclusion(pos) * 16;

          changes[id * valuesPerBlock + 0] = id;
          changes[id * valuesPerBlock + 1] = index;
          changes[id * valuesPerBlock + 2] = getBlockIndexInWorld(index);
          changes[id * valuesPerBlock + 3] = type;
          changes[id * valuesPerBlock + 4] = shade;
          changes[id * valuesPerBlock + 5] = colour;

          id += 1;
        }
      }

      dirty = false;

      return { blocks: changes, maxId: id - 1 };
    }

    var heightMap = new Uint8Array(dimensions.x * dimensions.z);

    function computeOcclusion(pos: THREE.Vector3) {
      var pindex = pos.z * dimensions.x + pos.x;

      if (heightMap[pindex] > pos.y) return 8;

      var combinedHeight = 0;

      for (var z = pos.z - 2; z <= pos.z + 2; z++) {
        for (var x = pos.x - 2; x <= pos.x + 2; x++) {
          // TODO: Need to peek height map from adjacent partitions
          if (x < 0) continue;
          if (z < 0) continue;
          if (x > dimensions.x - 1) continue;
          if (z > dimensions.z - 1) continue;

          var r = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.z - z, 2));

          var index = z * dimensions.x + x;

          var height = heightMap[index] - pos.y;

          if (height > 0) combinedHeight += height / (r * r);
        }
      }

      return Math.min(combinedHeight, 8);
    }

    function updateHeightMap() {
      for (var z = 0; z < dimensions.z; z++) {
        for (var x = 0; x < dimensions.x; x++) {
          var index = z * dimensions.x + x;

          heightMap[index] = getHighestPoint(x, z);
        }
      }
    }

    function getHighestPoint(x: number, z: number) {
      for (var y = dimensions.y - 1; y >= 0; y--) {
        var index = getIndex(x, y, z);

        if (blocks[VALUES_PER_BLOCK * index] !== 0) return y;
      }

      return 0;
    }

    return {
      dimensions: dimensions,
      position: partitionPosition,
      index: partitionIndex,
      offset: offset,
      capacity: capacity,
      initIfRequired: initIfRequired,
      getBlock: getBlock,
      setBlock: setBlock,
      setRandomHeight: setRandomHeight,
      isDirty: isDirty,
      getVisibleBlocks: getVisibleBlocks
    };
  }
}

export default Partition;
