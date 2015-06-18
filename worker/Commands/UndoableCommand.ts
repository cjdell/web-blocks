/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import cmd from './Command';
import part from '../Partition';
import com from '../../common/Common';

module UndoableCommand {
  interface PartitionSnapshot {
    indices: Int32Array;
    blockData: Uint8Array;
  }

  interface PartitionSnapshots {
    [index: number]: PartitionSnapshot;
  }

  export class UndoableCommand implements cmd.Command {
    worldInfo: com.WorldInfo
    version: number;
    snapshots: PartitionSnapshots;

    constructor(worldInfo: com.WorldInfo, version: number) {
      this.worldInfo = worldInfo;
      this.version = version;
      this.snapshots = {};
    }

    protected allocateSnapshot(partition: part.Partition, blocks: number): void {
      const snapshot: PartitionSnapshot = {
        indices: new Int32Array(blocks),
        blockData: new Uint8Array(blocks * 2)
      };

      this.snapshots[partition.index] = snapshot;
    }

    protected setBlock(partition: part.Partition, blockNumber: number, position: THREE.Vector3, type: number, colour: number): void {
      const snapshot = this.snapshots[partition.index];

      const positionInPart = new THREE.Vector3(position.x - partition.offset.x, position.y - partition.offset.y, position.z - partition.offset.z);
      const blockIndex = com.getBlockIndexWithinPartition(this.worldInfo, positionInPart);
      const blockData = partition.getBlock(positionInPart);

      snapshot.indices[blockNumber] = blockIndex;
      snapshot.blockData[blockNumber * 2 + 0] = blockData[0];
      snapshot.blockData[blockNumber * 2 + 1] = blockData[1];

      partition.setBlock(positionInPart, type, colour);
    }

    getAffectedPartitionIndices(): number[] {
      throw new Error('Not implemented');
    }

    redo(partition: part.Partition): void {
      throw new Error('Not implemented');
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

export default UndoableCommand;
