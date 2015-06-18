/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import cmd from './Command';
import ucmd from './UndoableCommand';
import part from '../Partition';
import com from '../../common/Common';
import noise from '../ImprovedNoise';

module LandscapeCommand {
  export interface LandscapeCommandOptions {
    height: number;
  }

  export class LandscapeCommand extends ucmd.UndoableCommand {
    options: LandscapeCommandOptions;

    constructor(worldInfo: com.WorldInfo, version: number, options: LandscapeCommandOptions) {
      super(worldInfo, version);

      this.options = options;
    }

    getAffectedPartitionIndices(): number[] {
      return null;
    }

    redo(partition: part.Partition): void {
      const width = partition.dimensions.x, height = partition.dimensions.z;

      const data = <number[]>[];
      const perlin = noise.NewImprovedNoise();
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
          let y2 = Math.min(Math.abs(data[index] * 0.2), partition.dimensions.y) | 0;

          if (y2 >= 1) {
            partition.setBlock(new THREE.Vector3(x, y2, z), 2, 0);
          } else {
            partition.setBlock(new THREE.Vector3(x, 1, z), 3, 0);
          }
        }
      }
    }
  }
}

export default LandscapeCommand;
