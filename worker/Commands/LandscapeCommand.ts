/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/Common';
import Command from './Command';
import UndoableCommand from './UndoableCommand';
import Partition from '../Partition';
import ImprovedNoise from '../ImprovedNoise';

export interface LandscapeCommandOptions {
  height: number;
}

export class LandscapeCommand extends UndoableCommand {
  options: LandscapeCommandOptions;

  constructor(worldInfo: com.WorldInfo, version: number, options: LandscapeCommandOptions) {
    super(worldInfo, version);

    this.options = options;
  }

  getAffectedPartitionIndices(): number[] {
    return null;
  }

  redo(partition: Partition): void {
    // return;

    const width = this.worldInfo.partitionDimensionsInBlocks.x, height = this.worldInfo.partitionDimensionsInBlocks.z;

    const data = <number[]>[];
    const perlin = new ImprovedNoise();
    const size = width * height;

    let quality = 1;

    let index = 0;

    for (let j = 0; j < 4; j++) {
      if (j == 0) for (let i = 0; i < size; i++) data[i] = 0;

      index = 0;

      for (let x = partition.offset.x; x < partition.offset.x + width; x++) {
        for (let z = partition.offset.z; z < partition.offset.z + height; z++ , index++) {
          data[index] += perlin.noise(x / quality, z / quality, this.options.height) * quality;
        }
      }

      quality *= 4;
    }

    index = 0;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++ , index++) {
        let y2 = Math.min(Math.abs(data[index] * 0.2), this.worldInfo.partitionDimensionsInBlocks.y) | 0;

        if (y2 >= 1) {
          // partition.setBlock(new THREE.Vector3(x, y2, z), 2, 0);
          partition.setBlocks(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, y2, z), 2, 0);
        } else {
          // partition.setBlock(new THREE.Vector3(x, 1, z), 3, 0);
          partition.setBlocks(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 1, z), 3, 0);
        }
      }
    }
  }
}
