/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/Common';
import Command from './Command';
import UndoableCommand from './UndoableCommand';
import Partition from '../Partition';
import { Operation } from '../Operations/Operation';

export interface CuboidCommandOptions {
  start: com.IntVector3;
  end: com.IntVector3;
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

export class OperationCommand extends UndoableCommand {
  operation: Operation;

  constructor(worldInfo: com.WorldInfo, version: number, operation: Operation) {
    super(worldInfo, version, null);

    this.operation = operation;
  }

  getAffectedPartitionIndices(): number[] {
    return this.operation.getAffectedPartitionIndices();
  }

  redo(partition: Partition): void {
    // console.time('redo');

    const result = this.operation.getBlocks(partition.index);

    this.allocateSnapshot(partition, result.ids.length);

    for (let blockNumber = 0; blockNumber < result.ids.length; blockNumber++) {
      const rindex = result.ids[blockNumber];

      const type = result.buffer[blockNumber * 2 + 0];
      const colour = result.buffer[blockNumber * 2 + 1];

      const rpos = this.worldInfo.rpos2(rindex);

      const wpos = partition.offset.add(rpos);

      this.setBlock(partition, blockNumber, wpos, type, colour);
    }

    // console.timeEnd('redo');
  }
}
