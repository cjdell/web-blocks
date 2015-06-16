/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import cmd from './Command';
import part from '../Partition';
import com from '../Common';

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

  export class CuboidCommand implements cmd.Command {
    worldInfo: com.WorldInfo
    version: number;
    options: CuboidCommandOptions;
    snapshots: PartitionSnapshots;

    constructor(worldInfo: com.WorldInfo, version: number, options: CuboidCommandOptions) {
      this.worldInfo = worldInfo;
      this.version = version;
      this.options = options;
      this.snapshots = {};

      com.ensureStartEndOrder(this.options.start, this.options.end);
    }

    getAffectedPartitionIndices(): number[] {
      const p1 = com.getPartitionForPosition(this.worldInfo, this.options.start);
      const p2 = com.getPartitionForPosition(this.worldInfo, this.options.end);

      const indices = new Array<number>();

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

      const snapshot: PartitionSnapshot = {
        indices: new Int32Array(blocks),
        blockData: new Uint8Array(blocks * 2)
      };

      let i = 0;

      for (let z = start.z; z <= end.z; z++) {
        for (let y = start.y; y <= end.y; y++) {
          for (let x = start.x; x <= end.x; x++ , i++) {
            const position = new THREE.Vector3(x - partition.offset.x, y - partition.offset.y, z - partition.offset.z);
            const blockIndex = com.getBlockIndexWithinPartition(this.worldInfo, position);
            const blockData = partition.getBlock(position);

            snapshot.indices[i] = blockIndex;
            snapshot.blockData[i * 2 + 0] = blockData[0];
            snapshot.blockData[i * 2 + 1] = blockData[1];

            partition.setBlock(position, this.options.type, this.options.colour);
          }
        }
      }

      this.snapshots[partition.index] = snapshot;
    }

    undo(partition: part.Partition): void {
      const snapshot = this.snapshots[partition.index];

      for (let i = 0; i < snapshot.indices.length; i++) {
        const index = snapshot.indices[i];
        const position = com.getPositionFromIndex(this.worldInfo, index);

        const type = snapshot.blockData[i * 2 + 0];
        const colour = snapshot.blockData[i * 2 + 1];

        partition.setBlock(position, type, colour);
      }
    }
  }
}

export default CuboidCommand;
