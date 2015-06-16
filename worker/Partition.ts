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
    let capacity = dimensions.x * dimensions.y * dimensions.z;
    let offset = new THREE.Vector3(partitionPosition.x * dimensions.x, partitionPosition.y * dimensions.y, partitionPosition.z * dimensions.z);
    let blocks: Uint8Array = null;
    let dirty = false;
    let occupied = 0;   // Total of everything that isn't air

    const VALUES_PER_BLOCK = 2;

    function initIfRequired(): void {
      if (blocks === null) {
        blocks = new Uint8Array(capacity * 2);
      }
    }

    function getBlock(position: THREE.Vector3): Uint8Array {
      let index = getIndex(position.x, position.y, position.z);

      return new Uint8Array([blocks[VALUES_PER_BLOCK * index]]);
    }

    function setBlockWithIndex(index: number, type: number, colour: number): void {
      let offset = VALUES_PER_BLOCK * index;

      let currentType = blocks[offset + 0];

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
      for (let z = start.z; z <= end.z; z++) {
        for (let y = start.y; y <= end.y; y++) {
          let index = getIndex(start.x, y, z);
          for (let x = start.x; x <= end.x; x++, index++) {
            setBlockWithIndex(index, type, 0);
          }
        }
      }
    }

    function getIndex(x: number, y: number, z: number): number {
      return x + dimensions.x * (y + dimensions.y * z);
    }

    function getPositionFromIndex(index: number) {
      let z = Math.floor(index / (dimensions.x * dimensions.y));
      let y = Math.floor((index - z * dimensions.x * dimensions.y) / dimensions.x);
      let x = index - dimensions.x * (y + dimensions.y * z);

      return new THREE.Vector3(x, y, z);
    }

    function canBlockBeSeen(index: number): boolean {
      let pos = getPositionFromIndex(index);

      if (pos.x === 0 || pos.y === 0 || pos.z === 0) return true;
      if (pos.x === dimensions.x - 1 || pos.y === dimensions.y - 1 || pos.z === dimensions.z - 1) return true;

      let xdi = index - 1;
      let xui = index + 1;

      let ydi = index - dimensions.x;
      let yui = index + dimensions.x;

      let zdi = index - (dimensions.x * dimensions.y);
      let zui = index + (dimensions.x * dimensions.y);

      let xd = blocks[VALUES_PER_BLOCK * xdi];
      let xu = blocks[VALUES_PER_BLOCK * xui];

      let yd = blocks[VALUES_PER_BLOCK * ydi];
      let yu = blocks[VALUES_PER_BLOCK * yui];

      let zd = blocks[VALUES_PER_BLOCK * zdi];
      let zu = blocks[VALUES_PER_BLOCK * zui];

      return !(xd && xu && yd && yu && zd && zu);
    }

    function getWorldIndexFromWorldPosition(x: number, y: number, z: number) {
      return x + (worldDimensions.x * dimensions.x) * (y + (worldDimensions.y * dimensions.y) * z);
    }

    function getBlockIndexInWorld(blockIndex: number): number {
      let position = getPositionFromIndex(blockIndex);

      position.x += offset.x;
      position.y += offset.y;
      position.z += offset.z;

      return getWorldIndexFromWorldPosition(position.x, position.y, position.z);
    }

    function setRandomHeight(h: number): void {
      let width = dimensions.x, height = dimensions.z;

      let data = <number[]>[];
      let perlin = noise.NewImprovedNoise();
      let size = width * height;
      let quality = 1;
      //let h = Math.random() * dimensions.y;

      for (let j = 0; j < 4; j++) {
        if (j == 0) for (let i = 0; i < size; i++) data[i] = 0;

        let index = 0;

        for (let x = offset.x; x < offset.x + width; x++) {
          for (let z = offset.z; z < offset.z + height; z++, index++) {
            data[index] += perlin.noise(x / quality, z / quality, h) * quality;
          }
        }

        quality *= 4;
      }

      let index2 = 0;

      for (let x = 0; x < width; x++) {
        for (let z = 0; z < height; z++, index2++) {
          let y2 = Math.min(Math.abs(data[index2] * 0.2), dimensions.y) | 0;

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
      let valuesPerBlock = 6;

      updateHeightMap();

      let id = 0;
      let changes = new Int32Array(occupied * valuesPerBlock);

      for (let index = 0; index < capacity; index++) {
        let offset = VALUES_PER_BLOCK * index;

        let type = blocks[offset + 0];
        let colour = blocks[offset + 1];

        if (type !== 0 && canBlockBeSeen(index)) {
          let pos = getPositionFromIndex(index);

          let shade = computeOcclusion(pos) * 16;

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

    let heightMap = new Uint8Array(dimensions.x * dimensions.z);

    function computeOcclusion(pos: THREE.Vector3) {
      let pindex = pos.z * dimensions.x + pos.x;

      if (heightMap[pindex] > pos.y) return 8;

      let combinedHeight = 0;

      for (let z = pos.z - 2; z <= pos.z + 2; z++) {
        for (let x = pos.x - 2; x <= pos.x + 2; x++) {
          // TODO: Need to peek height map from adjacent partitions
          if (x < 0) continue;
          if (z < 0) continue;
          if (x > dimensions.x - 1) continue;
          if (z > dimensions.z - 1) continue;

          let r = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.z - z, 2));

          let index = z * dimensions.x + x;

          let height = heightMap[index] - pos.y;

          if (height > 0) combinedHeight += height / (r * r);
        }
      }

      return Math.min(combinedHeight, 8);
    }

    function updateHeightMap() {
      for (let z = 0; z < dimensions.z; z++) {
        for (let x = 0; x < dimensions.x; x++) {
          let index = z * dimensions.x + x;

          heightMap[index] = getHighestPoint(x, z);
        }
      }
    }

    function getHighestPoint(x: number, z: number) {
      for (let y = dimensions.y - 1; y >= 0; y--) {
        let index = getIndex(x, y, z);

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
