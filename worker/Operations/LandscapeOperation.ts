"use strict";
/// <reference path="../../typings/tsd.d.ts" />
import com from '../../common/WorldInfo';
import { Operation, OperationResult } from './Operation';
import ImprovedNoise from '../ImprovedNoise';
import { BlockTypeIds } from '../../common/BlockTypeList';

export interface LandscapeOptions {
  height: number;
}

export class LandscapeOperation extends Operation {
  options: LandscapeOptions;

  constructor(worldInfo: com.WorldInfo, options: LandscapeOptions) {
    super(worldInfo);

    this.options = options;
  }

  getAffectedPartitionIndices(): number[] {
    return null;
  }

  getBlocks(pindex: number): OperationResult {
    // console.time('LandscapeOperation');

    const ppos = this.worldInfo.ppos(pindex);

    // These are the partition boundaries
    const pstart = ppos.mul(this.worldInfo.partitionDimensionsInBlocks);
    const pend = pstart.add(this.worldInfo.partitionDimensionsInBlocks).sub(new com.IntVector3(1, 1, 1));

    const blocks = this.worldInfo.partitionCapacity;

    const buffer = new Uint8Array(blocks * 2);
    const ids = new Uint32Array(blocks);

    for (let index = 0; index < blocks; index += 1) {
      ids[index] = index;
    }

    const width = this.worldInfo.partitionDimensionsInBlocks.x;
    const height = this.worldInfo.partitionDimensionsInBlocks.z;

    const data = new Float64Array(width * height);
    const perlin = new ImprovedNoise();
    const size = width * height;

    let reciprocal_of_quality = 1;

    let index = 0;

    for (let j = 0; j < 5; j++) {
      if (j === 0) for (let i = 0; i < size; i++) data[i] = 0;

      index = 0;

      for (let x = pstart.x * reciprocal_of_quality; x < (pstart.x + width) * reciprocal_of_quality; x += reciprocal_of_quality) {
        for (let z = pstart.z * reciprocal_of_quality; z < (pstart.z + height) * reciprocal_of_quality; z += reciprocal_of_quality, index++) {
          data[index] += perlin.noise(x, z, this.options.height) / reciprocal_of_quality;
        }
      }

      reciprocal_of_quality *= 0.3125;
    }

    index = 0;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++ , index++) {
        let y2 = Math.min(Math.abs(data[index] * 0.2), this.worldInfo.partitionDimensionsInBlocks.y) | 0;

        if (y2 >= 3) {
          for (let y = 0; y <= Math.min(this.worldInfo.partitionDimensionsInBlocks.y - 1, y2); y++) {
            const rindex = this.worldInfo.rindex(x, y, z);

            if (rindex * 2 + 0 >= buffer.length) throw new Error('Bang');

            buffer[rindex * 2 + 0] = BlockTypeIds.Grass;
          }
        } else {
          const rindex = this.worldInfo.rindex(x, 2, z);

          // if (rindex * 2 + 0 >= buffer.length) throw new Error('Bang');

          buffer[rindex * 2 + 0] = BlockTypeIds.Water;
        }
      }
    }

    // console.timeEnd('LandscapeOperation');

    return { buffer, ids };
  }
}
