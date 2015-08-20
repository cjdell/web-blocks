/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/Common';
import Command from './Command';
import Partition from '../Partition';

interface PartitionSnapshot {
  indices: Int32Array;
  blockData: Uint8Array;
}

interface PartitionSnapshots {
  [index: number]: PartitionSnapshot;
}

export default class UndoableCommand extends Command {
  snapshots: PartitionSnapshots;

  constructor(worldInfo: com.WorldInfo, version: number, options: any) {
    super(worldInfo, version, options);

    this.snapshots = {};
  }

  protected allocateSnapshot(partition: Partition, blocks: number): void {
    const snapshot: PartitionSnapshot = {
      indices: new Int32Array(blocks),
      blockData: new Uint8Array(blocks * 2)
    };

    this.snapshots[partition.index] = snapshot;
  }

  protected setBlock(partition: Partition, blockNumber: number, position: com.IntVector3, type: number, colour: number): void {
    const snapshot = this.snapshots[partition.index];

    const { x: rx, y: ry, z: rz } = this.worldInfo.rposw2(position.x, position.y, position.z);

    const rindex = this.worldInfo.rindex2(rx, ry, rz);

    const blockData = partition.getBlockWithIndex(rindex);

    // if (blockNumber >= snapshot.indices.length) throw new Error('Out of range: ' + snapshot.indices.length + '/' + blockNumber);

    snapshot.indices[blockNumber] = rindex;
    snapshot.blockData[blockNumber * 2 + 0] = blockData;
    // snapshot.blockData[blockNumber * 2 + 1] = blockData[1];

    partition.setBlockWithIndex(rindex, type, colour);
  }

  undo(partition: Partition): void {
    // console.log('undo', partition.index);

    const snapshot = this.snapshots[partition.index];

    for (let i = 0; i < snapshot.indices.length; i++) {
      const rindex = snapshot.indices[i];

      const type = snapshot.blockData[i * 2 + 0];
      const colour = snapshot.blockData[i * 2 + 1];

      partition.setBlockWithIndex(rindex, type, colour);
    }
  }
}
