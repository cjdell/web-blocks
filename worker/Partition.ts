"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../common/WorldInfo';

const VALUES_PER_BLOCK = 3;

export default class Partition {
  worldInfo: com.WorldInfo;
  partitionPosition: com.IntVector3;
  index: number;

  capacity: number;
  offset: com.IntVector3;
  blocks: Uint8Array = null;
  dirty = false;
  occupied = 0;

  heightMap: Uint8Array;

  constructor(worldInfo: com.WorldInfo, ppos: com.IntVector3) {
    this.worldInfo = worldInfo;
    this.partitionPosition = ppos;

    this.index = this.worldInfo.pindex(ppos.x, ppos.y, ppos.z);
    this.capacity = this.worldInfo.partitionCapacity;
    this.offset = new com.IntVector3(ppos.x * this.worldInfo.partitionDimensionsInBlocks.x, ppos.y * this.worldInfo.partitionDimensionsInBlocks.y, ppos.z * this.worldInfo.partitionDimensionsInBlocks.z);

    this.dirty = false;
    this.occupied = 0;   // Total of everything that isn't air

    this.heightMap = new Uint8Array(this.worldInfo.partitionDimensionsInBlocks.x * this.worldInfo.partitionDimensionsInBlocks.z);
  }

  init(): void {
    this.blocks = new Uint8Array(this.capacity * VALUES_PER_BLOCK);
  }

  getBlockWithIndex(rindex: number): number {
    return this.blocks[VALUES_PER_BLOCK * rindex + 0];
  }

  getBlock(rx: number, ry: number, rz: number): Uint8Array {
    const index = this.worldInfo.rindex(rx, ry, rz);

    return new Uint8Array([this.blocks[VALUES_PER_BLOCK * index]]);
  }

  setBlockWithIndex(index: number, type: number, colour: number): void {
    const offset = VALUES_PER_BLOCK * index;

    const currentType = this.blocks[offset + 0];

    if (currentType === type) return;

    this.blocks[offset + 0] = type;
    this.blocks[offset + 1] = colour | 0;

    if (currentType === 0)
      this.occupied += 1;
    else if (type === 0)
      this.occupied -= 1;

    this.dirty = true;
  }

  setBlock(px: number, py: number, pz: number, type: number, colour: number): void {
    if (px < 0 || py < 0 || pz < 0) throw new Error('Out of range');
    if (px >= this.worldInfo.partitionDimensionsInBlocks.x || py >= this.worldInfo.partitionDimensionsInBlocks.y || pz >= this.worldInfo.partitionDimensionsInBlocks.z) throw new Error('Out of range');

    this.setBlockWithIndex(this.worldInfo.rindex(px, py, pz), type, colour);
  }

  setBlocks(start: THREE.Vector3, end: THREE.Vector3, type: number, colour: number): void {
    for (let z = start.z; z <= end.z; z++) {
      for (let y = start.y; y <= end.y; y++) {
        let index = this.worldInfo.rindex(start.x, y, z);
        for (let x = start.x; x <= end.x; x++ , index++) {
          this.setBlockWithIndex(index, type, 0);
        }
      }
    }
  }

  isDirty(): boolean {
    return this.dirty;
  }

  updateHeightMap() {
    for (let z = 0; z < this.worldInfo.partitionDimensionsInBlocks.z; z++) {
      for (let x = 0; x < this.worldInfo.partitionDimensionsInBlocks.x; x++) {
        const index = z * this.worldInfo.partitionDimensionsInBlocks.x + x;

        this.heightMap[index] = this.getHighestPoint(x, z);
      }
    }
  }

  getHighestPoint(x: number, z: number) {
    for (let y = this.worldInfo.partitionDimensionsInBlocks.y - 1; y >= 0; y--) {
      const index = this.worldInfo.rindex(x, y, z);

      if (this.blocks[VALUES_PER_BLOCK * index] !== 0) return y;
    }

    return 0;
  }

  isInited(): boolean {
    return this.blocks !== null;
  }
}
