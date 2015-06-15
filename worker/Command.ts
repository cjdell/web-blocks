/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import part from './Partition';
import com from './Common';

module Command {
  export interface Command {
    getAffectedPartitionIndices(): number[];
    redo(partition: part.Partition): void;
    undo(partition: part.Partition): void;
  }

  export interface CuboidCommandOptions {
    start: THREE.Vector3;
    end: THREE.Vector3;
    type: number;
    colour: number;
  }

  export class CuboidCommand implements Command {
    worldInfo: com.WorldInfo
    version: number;
    options: CuboidCommandOptions;

    // indices: Int32Array;
    // blockData: Uint8Array;

    constructor(worldInfo: com.WorldInfo, version: number, options: CuboidCommandOptions) {
      this.worldInfo = worldInfo;
      this.version = version;
      this.options = options;

      com.ensureStartEndOrder(this.options.start, this.options.end);
    }

    getAffectedPartitionIndices(): number[] {
      var p1 = com.getPartitionForPosition(this.worldInfo, this.options.start);
      var p2 = com.getPartitionForPosition(this.worldInfo, this.options.end);

      var indices = new Array<number>();

      for (let px = p1.x; px <= p2.x; px++) {
        for (let py = p1.y; py <= p2.y; py++) {
          for (let pz = p1.z; pz <= p2.z; pz++) {
            let partitionIndex = com.getPartitionIndex(this.worldInfo, new THREE.Vector3(px, py, pz));
            indices.push(partitionIndex);
          }
        }
      }

      return indices;
    }

    redo(partition: part.Partition): void {
      for (let z = this.options.start.z; z <= this.options.end.z; z++) {
        for (let y = this.options.start.y; y <= this.options.end.y; y++) {
          for (let x = this.options.start.x; x <= this.options.end.x; x++) {
            var position = new THREE.Vector3(x - partition.offset.x, y - partition.offset.y, z - partition.offset.z);
            partition.setBlock(position, this.options.type, this.options.colour);
          }
        }
      }
    }

    undo(partition: part.Partition): void {

    }
  }
}

export default Command;
