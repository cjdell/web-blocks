/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/Common';
import Command from './Command';
import UndoableCommand from './UndoableCommand';
import Partition from '../Partition';

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

export class CuboidCommand extends UndoableCommand {
  options: CuboidCommandOptions;

  constructor(worldInfo: com.WorldInfo, version: number, options: CuboidCommandOptions) {
    super(worldInfo, version);

    this.options = options;

    [this.options.start, this.options.end] = com.ensureStartEndOrder(this.options.start, this.options.end);

    // console.log('options', options);
  }

  getAffectedPartitionIndices(): number[] {
    const { x: px1, y: py1, z: pz1 } = this.worldInfo.ppos2(this.options.start.x, this.options.start.y, this.options.start.z);
    const { x: px2, y: py2, z: pz2 } = this.worldInfo.ppos2(this.options.end.x, this.options.end.y, this.options.end.z);

    const indices = new Array<number>();

    for (let px = px1; px <= px2; px++) {
      for (let py = py1; py <= py2; py++) {
        for (let pz = pz1; pz <= pz2; pz++) {
          const partitionIndex = this.worldInfo.pindex2(px, py, pz);
          indices.push(partitionIndex);
        }
      }
    }

    return indices;
  }

  redo(partition: Partition): void {
    // These are the partition bounaaries
    const pstart = partition.offset;
    const pend = pstart.add(this.worldInfo.partitionDimensionsInBlocks).sub(new com.IntVector3(1, 1, 1));

    let start = this.options.start;
    let end = this.options.end;

    // We only want the start and end that exists within the boundaries of this partition
    start = start.clamp(pstart, pend);
    end = end.clamp(pstart, pend);

    // console.log(start, end);

    const blocks =
      (1 + end.x - start.x) *
      (1 + end.y - start.y) *
      (1 + end.z - start.z);

    this.allocateSnapshot(partition, blocks);

    let blockNumber = 0;

    for (let z = start.z; z <= end.z; z++) {
      for (let y = start.y; y <= end.y; y++) {
        for (let x = start.x; x <= end.x; x++) {
          blockNumber++

          const wpos = new com.IntVector3(x, y, z);

          this.setBlock(partition, blockNumber, wpos, this.options.type, this.options.colour);
        }
      }
    }
  }
}
