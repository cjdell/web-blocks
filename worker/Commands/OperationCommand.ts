"use strict";
/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';
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

    const rpos = new Int32Array(3);
    const wpos = new Int32Array(3);
    const { x: ox, y: oy, z: oz } = partition.offset;

    for (let blockNumber = 0; blockNumber < result.ids.length; blockNumber++) {
      const rindex = result.ids[blockNumber];

      const type = result.buffer[blockNumber * 2 + 0];
      const colour = result.buffer[blockNumber * 2 + 1];

      this.worldInfo.rpos2(rpos, rindex);

      wpos[0] = rpos[0] + ox;
      wpos[1] = rpos[1] + oy;
      wpos[2] = rpos[2] + oz;

      this.setBlock(partition, blockNumber, wpos, type, colour);
    }

    // console.timeEnd('redo');
  }
}
