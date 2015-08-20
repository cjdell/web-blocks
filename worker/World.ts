/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');
import _ = require('underscore');

import com from '../common/Common';
import Partition from './Partition';
import Command from './Commands/Command';
import { CuboidOperation } from './Operations/CuboidOperation';
import { LandscapeOperation } from './Operations/LandscapeOperation';
import { OperationCommand } from './Commands/OperationCommand';

export interface ChangeHandler {
  callback(change: com.Change): void;
  options: com.ChangeHandlerOptions;
}

const VALUES_PER_BLOCK = 3 | 0;
const VALUES_PER_VBLOCK = 7 | 0;

export default class World {
  worldInfo: com.WorldInfo;

  capacity: number;
  partitionCapacity: number;

  commands = new Array<Command>();
  changeHandlers = Array<ChangeHandler>();
  recentChanges = Array<com.Change>();

  partitions: Partition[];

  constructor(worldInfo: com.WorldInfo) {
    this.worldInfo = worldInfo;

    this.capacity = worldInfo.worldPartitionCapacity;
    this.partitionCapacity = worldInfo.partitionCapacity;

    worldInfo.partitionBoundaries = this.getPartitionBoundaries();

    // setTimeout(() => this.saveCommands(), 2000);
  }

  registerChangeHandler(handler: ChangeHandler) {
    this.changeHandlers.push(handler);
  }

  flushChanges = _.debounce(() => {
    this.recentChanges.forEach(change => {
      this.changeHandlers.forEach(changeHandler => {
        const start = changeHandler.options.start;
        const end = changeHandler.options.end;
        const pos = change.position;

        // Is it inside the boundary?
        pos.clone().clamp(start, end).equals(pos);

        changeHandler.callback(change);
      });
    });
  }, 200);

  init(): void {
    this.partitions = new Array<Partition>(this.capacity);

    for (let z = 0; z < this.worldInfo.worldDimensionsInPartitions.z; z++) {
      for (let y = 0; y < this.worldInfo.worldDimensionsInPartitions.y; y++) {
        for (let x = 0; x < this.worldInfo.worldDimensionsInPartitions.x; x++) {
          const ppos = new com.IntVector3(x, y, z);
          const pindex = this.worldInfo.pindex2(x, y, z);

          this.partitions[pindex] = new Partition(this.worldInfo, ppos);
        }
      }
    }

    // Apply the default landscape
    const randomHeight = this.worldInfo.partitionDimensionsInBlocks.y >> 1;
    const landscapeOperation = new LandscapeOperation(this.worldInfo, { height: randomHeight });

    const command = new OperationCommand(this.worldInfo, this.commands.length, landscapeOperation);

// const command = new LandscapeCommand(this.worldInfo, 0, { height: randomHeight });

    this.applyCommand(command);
  }

  getPartitionCapacity(): number {
    return this.partitionCapacity;
  }

  getPartitions(): Partition[] {
    return this.partitions;
  }

  loadPartition(partition: Partition) {
    if (!partition.isInited()) {
      partition.init();

      // Apply commands as partitions are brought into existance
      this.commands.forEach(command => {
        const indices = command.getAffectedPartitionIndices();

        if (indices === null || indices.indexOf(partition.index) !== (-1 | 0)) {
          command.redo(partition);
        }
      });
    }
  }

  // Lazily load the partitions at they are needed
  getPartitionByIndex(partitionIndex: number): Partition {
    const partition = this.partitions[partitionIndex];

    // if (!partition) throw new Error('Invalid partition');

    this.loadPartition(partition);

    return partition;
  }

  getBlock(wx: number, wy: number, wz: number): number {
    const ppos = this.worldInfo.pposw2(wx, wy, wz);

    if (!this.worldInfo.vppos2(ppos.x, ppos.y, ppos.z)) return 0 | 0;

    const rpos = this.worldInfo.rposw2(wx, wy, wz);
    const rindex = this.worldInfo.rindex2(rpos.x, rpos.y, rpos.z);

    const pindex = this.worldInfo.pindex2(ppos.x, ppos.y, ppos.z);
    const partition = this.getPartitionByIndex(pindex);

    return partition.blocks[rindex * VALUES_PER_BLOCK];
  }

  applyCommand(command: Command): void {
    this.commands.push(command);

    const indices = command.getAffectedPartitionIndices();
    let partitionsToApply = this.partitions;

    if (indices !== null) partitionsToApply = indices.map(i => this.partitions[i]);

    partitionsToApply.filter(p => p.isInited()).forEach(command.redo, command);
  }

  saveCommands(): void {
    console.log(JSON.stringify(this.commands));
  }

  undo(): void {
    if (this.commands.length === (0 | 0)) return;

    const command = this.commands.pop();

    const indices = command.getAffectedPartitionIndices();
    let partitionsToApply = this.partitions;

    if (indices !== null) partitionsToApply = indices.map(i => this.partitions[i]);

    partitionsToApply.filter(p => p.isInited()).forEach(command.undo, command);
  }

  setBlocks(wx1: number, wy1: number, wz1: number, wx2: number, wy2: number, wz2: number, type: number, colour: number): void {
    const operation = new CuboidOperation(this.worldInfo, {
      start: new com.IntVector3(wx1, wy1, wz1),
      end: new com.IntVector3(wx2, wy2, wz2),
      type: type,
      colour: colour
    });

    const command = new OperationCommand(this.worldInfo, this.commands.length, operation);

    // const command = new CuboidCommand(this.worldInfo, this.commands.length, {
    //   start: new com.IntVector3(wx1, wy1, wz1),
    //   end: new com.IntVector3(wx2, wy2, wz2),
    //   type: type,
    //   colour: colour
    // });

    return this.applyCommand(command);
  }

  addBlock(windex: number, side: number, type: number): void {
    let { x: wx, y: wy, z: wz } = this.worldInfo.wpos2(windex);

    if (type === 0) {
      return this.setBlocks(wx, wy, wz, wx, wy, wz, type, 0 | 0);
    }

    if (side === 0) {
      wx++;
    }
    if (side === 1) {
      wx--;
    }
    if (side === 2) {
      wy++;
    }
    if (side === 3) {
      wy--;
    }
    if (side === 4) {
      wz++;
    }
    if (side === 5) {
      wz--;
    }

    this.setBlocks(wx, wy, wz, wx, wy, wz, type, 0 | 0);
  }

  getPartitionBoundaries(): any[] {
    const partitionBoundaries = <any[]>[];

    for (let z = 0; z < this.worldInfo.worldDimensionsInPartitions.z; z++) {
      for (let y = 0; y < this.worldInfo.worldDimensionsInPartitions.y; y++) {
        for (let x = 0; x < this.worldInfo.worldDimensionsInPartitions.x; x++) {
          const partitionIndex = this.worldInfo.pindex2(x, y, z);

          const boundaryPoints = <THREE.Vector3[]>[];

          for (let bx = 0; bx < 2; bx++) {
            for (let by = 0; by < 2; by++) {
              for (let bz = 0; bz < 2; bz++) {
                const x1 = this.worldInfo.partitionDimensionsInBlocks.x * (x + bx);
                const y1 = this.worldInfo.partitionDimensionsInBlocks.y * (y + by);
                const z1 = this.worldInfo.partitionDimensionsInBlocks.z * (z + bz);

                boundaryPoints.push(new THREE.Vector3(x1, y1, z1));
              }
            }
          }

          partitionBoundaries.push({ partitionIndex: partitionIndex, points: boundaryPoints });
        }
      }
    }

    return partitionBoundaries;
  }

  getDirtyPartitions(): number[] {
    const dirty = new Array<number>();

    for (let partitionIndex = 0 | 0; partitionIndex < this.capacity; partitionIndex++) {
      const partition = this.partitions[partitionIndex];

      if (!partition) console.log('no part', partitionIndex);

      if (partition.isDirty()) {
        dirty.push(partitionIndex);
      }
    }

    return dirty;
  }

  // ========

  getSurroundingBlocks(partition: Partition, rindex: number): number {
    const { x, y, z } = this.worldInfo.rpos2(rindex);

    // if (x === 0 || y === 0 || z === 0) return 0;
    // if (x === this.worldInfo.partitionDimensionsInBlocks.x - 1 || y === this.worldInfo.partitionDimensionsInBlocks.y - 1 || z === this.worldInfo.partitionDimensionsInBlocks.z - 1) return 0;

    let i = 0 | 0;
    let sides = 0 | 0;

    for (let sz = -1 | 0; sz <= (1 | 0); sz++) {
      for (let sy = -1 | 0; sy <= (1 | 0); sy++) {
        for (let sx = -1 | 0; sx <= (1 | 0); sx++) {
          const rx = (x + sx) | 0;
          const ry = (y + sy) | 0;
          const rz = (z + sz) | 0;

          let block = 0 | 0;

          if (rx === (-1 | 0) || ry === (-1 | 0) || rz === (-1 | 0) || rx === this.worldInfo.partitionDimensionsInBlocks.x || ry === this.worldInfo.partitionDimensionsInBlocks.y || rz === this.worldInfo.partitionDimensionsInBlocks.z) {
            // If outside partition boundaries, we need to check adjacent partitions...
            block = this.getBlock((partition.offset.x + rx) | 0, (partition.offset.y + ry) | 0, (partition.offset.z + rz) | 0);
          } else {
            // otherwise, just read directly from partiton buffer (faster)
            const rindex = this.worldInfo.rindex2(rx, ry, rz) | 0;
            block = partition.blocks[VALUES_PER_BLOCK * rindex];
          }

          if (block !== (0 | 0)) sides |= (1 << i);

          i++;
        }
      }
    }

    return sides;
  }

  computeOcclusion(partition: Partition, rx: number, ry: number, rz: number) {
    const pdib = this.worldInfo.partitionDimensionsInBlocks;

    const pindex = rz * pdib.x + rx;

    if (partition.heightMap[pindex] > ry) return 8;

    let combinedHeight = 0;

    for (let z = rz - 2; z <= rz + 2; z++) {
      for (let x = rx - 2; x <= rx + 2; x++) {
        let height = 0;

        if (x < 0 || z < 0 || x > pdib.x - 1 || z > pdib.z - 1) {
          const ppos = this.worldInfo.pposw2(partition.offset.x + x, 0, partition.offset.z + z);

          if (this.worldInfo.vppos2(ppos.x, ppos.y, ppos.z)) {
            const { x: rx2, y: ry2, z: rz2 } = this.worldInfo.rposw2(partition.offset.x + x, 0, partition.offset.z + z);
            const pindex = this.worldInfo.pindex2(ppos.x, ppos.y, ppos.z);
            const index = rz2 * pdib.x + rx2;

            const adjacentPartition = this.getPartitionByIndex(pindex);

            height = adjacentPartition.heightMap[index] - ry;
          } else {
            height = 0;
          }
        } else {
          const index = z * pdib.x + x;

          height = partition.heightMap[index] - ry;
        }

        const r = Math.sqrt(Math.pow(rx - x, 2) + Math.pow(rz - z, 2));

        if (height > 0) combinedHeight += height / (r * r);
      }
    }

    return Math.min(combinedHeight, 8);
  }

  getVisibleBlocks(partitionIndex: number): Int32Array {
    // console.time('getVisibleBlocks');

    const partition = this.getPartitionByIndex(partitionIndex);

    const touchingIndices = new Int32Array([4 | 0, 10 | 0, 12 | 0, 14 | 0, 16 | 0, 22 | 0]);

    partition.updateHeightMap();

    const visibleBlocks = new Int32Array(partition.occupied * VALUES_PER_VBLOCK);

    let id = 0 | 0;

    for (let rindex = 0; rindex < partition.capacity; rindex++) {
      const offset = VALUES_PER_BLOCK * rindex | 0;
      const voffset = VALUES_PER_VBLOCK * id | 0;

      const type = partition.blocks[offset + 0];
      const colour = partition.blocks[offset + 1];

      if (type === (0 | 0)) continue;

      const surroundingBlocks = this.getSurroundingBlocks(partition, rindex);

      let sidesTouching = 0 | 0;

      for (let i = 0; i < touchingIndices.length; i++) {
        sidesTouching += (surroundingBlocks & (1 << touchingIndices[i])) ? 1 | 0 : 0 | 0;
      }

      if (sidesTouching === (6 | 0)) continue;

      const { x: rx, y: ry, z: rz } = this.worldInfo.rpos2(rindex);

      const shade = this.computeOcclusion(partition, rx, ry, rz) * 16;

      const windex = this.worldInfo.windex2(partition.offset.x + rx, partition.offset.y + ry, partition.offset.z + rz);

      visibleBlocks[voffset + 0 | 0] = id;
      visibleBlocks[voffset + 1 | 0] = rindex;
      visibleBlocks[voffset + 2 | 0] = windex;
      visibleBlocks[voffset + 3 | 0] = type;
      visibleBlocks[voffset + 4 | 0] = surroundingBlocks;
      visibleBlocks[voffset + 5 | 0] = colour;
      visibleBlocks[voffset + 6 | 0] = shade;

      id += 1 | 0;
    }

    partition.dirty = false;

    const ret = new Int32Array(id * VALUES_PER_VBLOCK);

    for (let i = 0; i < id * VALUES_PER_VBLOCK; i++) {
      ret[i] = visibleBlocks[i];
    }

    // console.timeEnd('getVisibleBlocks');

    return ret;
  }
}
