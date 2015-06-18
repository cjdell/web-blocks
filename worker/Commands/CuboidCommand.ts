/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import cmd from './Command';
import ucmd from './UndoableCommand';
import part from '../Partition';
import com from '../../common/Common';

module CuboidCommand {
  export interface CuboidCommandOptions {
    start: THREE.Vector3;
    end: THREE.Vector3;
    type: number;
    colour: number;
  }

  interface PartitionSnapshot {
    indices: Int32Array;
    blockData: Uint8Array;
  }

  interface PartitionSnapshots {
    [index: number]: PartitionSnapshot;
  }

  export class CuboidCommand extends ucmd.UndoableCommand {
    options: CuboidCommandOptions;

    constructor(worldInfo: com.WorldInfo, version: number, options: CuboidCommandOptions) {
      super(worldInfo, version);

      this.options = options;

      com.ensureStartEndOrder(this.options.start, this.options.end);
    }

    getAffectedPartitionIndices(): number[] {
      const p1 = com.getPartitionForPosition(this.worldInfo, this.options.start);
      const p2 = com.getPartitionForPosition(this.worldInfo, this.options.end);

      const indices = new Array<number>();

      for (let px = p1.x; px <= p2.x; px++) {
        for (let py = p1.y; py <= p2.y; py++) {
          for (let pz = p1.z; pz <= p2.z; pz++) {
            const partitionIndex = com.getPartitionIndex(this.worldInfo, new THREE.Vector3(px, py, pz));
            indices.push(partitionIndex);
          }
        }
      }

      return indices;
    }

    redo(partition: part.Partition): void {
      // These are the partition bounaaries
      const pstart = partition.offset.clone();
      const pend = pstart.clone().add(this.worldInfo.partitionDimensionsInBlocks);

      const start = this.options.start.clone();
      const end = this.options.end.clone();

      // We only want the start and end that exists within the boundaries of this partition
      start.clamp(pstart, pend);
      end.clamp(pstart, pend);

      const blocks =
        (1 + end.x - start.x) *
        (1 + end.y - start.y) *
        (1 + end.z - start.z);

      this.allocateSnapshot(partition, blocks);

      let blockNumber = 0;

      for (let z = start.z; z <= end.z; z++) {
        for (let y = start.y; y <= end.y; y++) {
          for (let x = start.x; x <= end.x; x++ , blockNumber++) {
            const positionInWorld = new THREE.Vector3(x, y, z);

            this.setBlock(partition, blockNumber, positionInWorld, this.options.type, this.options.colour);
          }
        }
      }
    }
  }
}

export default CuboidCommand;
