/// <reference path="../typings/index.d.ts" />
import THREE = require('three');
import _ = require('underscore');
import com                    from '../common/WorldInfo';
import Partition              from './Partition';
import Command                from './Commands/Command';
import { CuboidOperation }    from './Operations/CuboidOperation';
import { LandscapeOperation } from './Operations/LandscapeOperation';
import { TreeOperation }      from './Operations/TreeOperation';
import { OperationCommand }   from './Commands/OperationCommand';

// export interface ChangeHandler {
//   callback(change: com.Change): void;
//   options: com.ChangeHandlerOptions;
// }

export interface WorldChangedHandler {
  (world: World): void;
}

const VALUES_PER_BLOCK = 3 | 0;
const VALUES_PER_VBLOCK = 7 | 0;

export default class World {
  worldInfo: com.WorldInfo;

  capacity: number;
  partitionCapacity: number;

  commands = new Array<Command>();

  worldChangeHandlers = new Array<WorldChangedHandler>();

  // changeHandlers = Array<ChangeHandler>();
  // recentChanges = Array<com.Change>();

  partitions: Partition[];

  constructor(worldInfo: com.WorldInfo) {
    this.worldInfo = worldInfo;

    this.capacity = worldInfo.worldPartitionCapacity;
    this.partitionCapacity = worldInfo.partitionCapacity;

    worldInfo.partitionBoundaries = this.getPartitionBoundaries();

    // setTimeout(() => this.saveCommands(), 2000);
  }

  onWorldChanged(handler: WorldChangedHandler) {
    this.worldChangeHandlers.push(handler);
  }

  worldChanged() {
    this.worldChangeHandlers.forEach(handler => handler(this));
  }

  // registerChangeHandler(handler: ChangeHandler) {
  //   this.changeHandlers.push(handler);
  // }

  // flushChanges = _.debounce(() => {
  //   this.recentChanges.forEach(change => {
  //     this.changeHandlers.forEach(changeHandler => {
  //       const start = changeHandler.options.start;
  //       const end = changeHandler.options.end;
  //       const pos = change.position;

  //       // Is it inside the boundary?
  //       pos.clone().clamp(start, end).equals(pos);

  //       changeHandler.callback(change);
  //     });
  //   });
  // }, 200);

  init(): void {
    this.partitions = new Array<Partition>(this.capacity);

    for (let z = 0; z < this.worldInfo.worldDimensionsInPartitions.z; z++) {
      for (let y = 0; y < this.worldInfo.worldDimensionsInPartitions.y; y++) {
        for (let x = 0; x < this.worldInfo.worldDimensionsInPartitions.x; x++) {
          const ppos = new com.IntVector3(x, y, z);
          const pindex = this.worldInfo.pindex(x, y, z);

          this.partitions[pindex] = new Partition(this.worldInfo, ppos);
        }
      }
    }

    // Apply the default landscape
    const randomHeight = 16; //this.worldInfo.partitionDimensionsInBlocks.y >> 1;
    const landscapeOperation = new LandscapeOperation(this.worldInfo, { height: randomHeight });
    const landscapeCommand = new OperationCommand(this.worldInfo, this.commands.length, landscapeOperation);

    this.applyCommand(landscapeCommand);

    // Tree are WIP so disabled them for now...

    // for (let i = 0; i < 1000; i++) {
    //   const x = (Math.random() * this.worldInfo.worldDimensionsInBlocks.x * 0.5 + 10) | 0;
    //   const z = (Math.random() * this.worldInfo.worldDimensionsInBlocks.z * 0.5 + 10) | 0;

    //   const treeOperation = new TreeOperation(this.worldInfo, { pos: new com.IntVector3(x, 2, z) });
    //   const treeCommand = new OperationCommand(this.worldInfo, this.commands.length, treeOperation);

    //   this.applyCommand(treeCommand);
    // }
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
    const ppos = this.worldInfo.pposw(wx, wy, wz);

    if (!this.worldInfo.vppos(ppos.x, ppos.y, ppos.z)) return 0 | 0;

    const rpos = this.worldInfo.rposw(wx, wy, wz);
    const rindex = this.worldInfo.rindex(rpos.x, rpos.y, rpos.z);

    const pindex = this.worldInfo.pindex(ppos.x, ppos.y, ppos.z);
    const partition = this.getPartitionByIndex(pindex);

    return partition.blocks[rindex * VALUES_PER_BLOCK];
  }

  applyCommand(command: Command): void {
    this.commands.push(command);

    const indices = command.getAffectedPartitionIndices();
    let partitionsToApply = this.partitions;

    if (indices !== null) partitionsToApply = indices.map(i => this.partitions[i]);

    partitionsToApply.filter(p => p.isInited()).forEach(command.redo, command);

    this.worldChanged();
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

    this.worldChanged();
  }

  setBlocks(wx1: number, wy1: number, wz1: number, wx2: number, wy2: number, wz2: number, type: number, colour: number): void {
    const min = new com.IntVector3(0, 0, 0);

    const max = new com.IntVector3(
      this.worldInfo.worldDimensionsInBlocks.x - 1,
      this.worldInfo.worldDimensionsInBlocks.y - 1,
      this.worldInfo.worldDimensionsInBlocks.z - 1
    );

    let start = new com.IntVector3(wx1, wy1, wz1);
    let end = new com.IntVector3(wx2, wy2, wz2);

    start = start.clamp(min, max);
    end = end.clamp(min, max);

    const operation = new CuboidOperation(this.worldInfo, {
      start,
      end,
      type,
      colour,
    });

    const command = new OperationCommand(this.worldInfo, this.commands.length, operation);

    return this.applyCommand(command);
  }

  addBlock(wpos: com.IntVector3, side: number, type: number): void {
    let { x: wx, y: wy, z: wz } = wpos;

    if (type === 0) {
      // Air block we don't displace (works like delete)
      return this.setBlocks(wx, wy, wz, wx, wy, wz, type, 0 | 0);
    }

    // Displace the block position by the side that was clicked
    if (side === 0) {
      wx -= 1;
    }
    if (side === 1) {
      wx += 1;
    }
    if (side === 2) {
      wy -= 1;
    }
    if (side === 3) {
      wy += 1;
    }
    if (side === 4) {
      wz -= 1;
    }
    if (side === 5) {
      wz += 1;
    }

    this.setBlocks(wx, wy, wz, wx, wy, wz, type, 0 | 0);
  }

  getPartitionBoundaries(): com.PartitionBoundaries[] {
    const partitionBoundaries = <com.PartitionBoundaries[]>[];

    for (let z = 0; z < this.worldInfo.worldDimensionsInPartitions.z; z++) {
      for (let y = 0; y < this.worldInfo.worldDimensionsInPartitions.y; y++) {
        for (let x = 0; x < this.worldInfo.worldDimensionsInPartitions.x; x++) {
          const partitionIndex = this.worldInfo.pindex(x, y, z);

          const points = new Array<THREE.Vector3>();

          const x1 = this.worldInfo.partitionDimensionsInBlocks.x * (x + 0);
          const y1 = this.worldInfo.partitionDimensionsInBlocks.y * (y + 0);
          const z1 = this.worldInfo.partitionDimensionsInBlocks.z * (z + 0);

          const x2 = this.worldInfo.partitionDimensionsInBlocks.x * (x + 1);
          const y2 = this.worldInfo.partitionDimensionsInBlocks.y * (y + 1);
          const z2 = this.worldInfo.partitionDimensionsInBlocks.z * (z + 1);

          points.push(new THREE.Vector3(x1, y1, z1));
          points.push(new THREE.Vector3(x2, y2, z2));

          partitionBoundaries.push({ partitionIndex, points });
        }
      }
    }

    return partitionBoundaries;
  }

  getDirtyPartitions(): number[] {
    const dirty: number[] = [];

    for (let partitionIndex = 0 | 0; partitionIndex < this.capacity; partitionIndex += 1) {
      const ppos = this.worldInfo.ppos(partitionIndex);

      const checkAdjacent = (x: number, z: number, edge: number) => {
        if (
          ppos.x + x >= 0 &&
          ppos.z + z >= 0 &&
          ppos.x + x < this.worldInfo.worldDimensionsInPartitions.x &&
          ppos.z + z < this.worldInfo.worldDimensionsInPartitions.z
        ) {
          const pindex = this.worldInfo.pindex(ppos.x + x, 0, ppos.z + z);

          if (this.partitions[pindex].isEdgeDirty(edge)) {
            dirty.push(partitionIndex);
          }
        }
      };

      checkAdjacent(-1, 0, 1);
      checkAdjacent(0, -1, 3);
      checkAdjacent(1, 0, 0);
      checkAdjacent(0, 1, 2);
    }

    for (let partitionIndex = 0 | 0; partitionIndex < this.capacity; partitionIndex += 1) {
      const partition = this.partitions[partitionIndex];

      if (partition.isDirty()) {
        dirty.push(partitionIndex);
        partition.clearDirty();
      }
    }

    return _.unique(dirty);
  }

  // ========

  getSurroundingBlocks(partition: Partition, rindex: number): number {
    const rpos = this.worldInfo.rpos(rindex);

    // if (x === 0 || y === 0 || z === 0) return 0;
    // if (x === this.worldInfo.partitionDimensionsInBlocks.x - 1 || y === this.worldInfo.partitionDimensionsInBlocks.y - 1 || z === this.worldInfo.partitionDimensionsInBlocks.z - 1) return 0;

    let i = 0 | 0;
    let sides = 0 | 0;

    for (let sz = -1 | 0; sz <= (1 | 0); sz++) {
      for (let sy = -1 | 0; sy <= (1 | 0); sy++) {
        for (let sx = -1 | 0; sx <= (1 | 0); sx++) {
          const rx = (rpos.x + sx) | 0;
          const ry = (rpos.y + sy) | 0;
          const rz = (rpos.z + sz) | 0;

          let block = 0 | 0;

          if (
            rx === (-1 | 0) ||
            ry === (-1 | 0) ||
            rz === (-1 | 0) ||
            rx === this.worldInfo.partitionDimensionsInBlocks.x ||
            ry === this.worldInfo.partitionDimensionsInBlocks.y ||
            rz === this.worldInfo.partitionDimensionsInBlocks.z
          ) {
            // If outside partition boundaries, we need to check adjacent partitions...
            block = this.getBlock(
              (partition.offset.x + rx) | 0,
              (partition.offset.y + ry) | 0,
              (partition.offset.z + rz) | 0
            );
          } else {
            // otherwise, just read directly from partiton buffer (faster)
            const rindex = this.worldInfo.rindex(rx, ry, rz) | 0;
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
          const ppos = this.worldInfo.pposw(partition.offset.x + x, 0, partition.offset.z + z);

          if (this.worldInfo.vppos(ppos.x, ppos.y, ppos.z)) {
            const { x: rx2, y: ry2, z: rz2 } = this.worldInfo.rposw(partition.offset.x + x, 0, partition.offset.z + z);
            const pindex = this.worldInfo.pindex(ppos.x, ppos.y, ppos.z);
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

      const { x: rx, y: ry, z: rz } = this.worldInfo.rpos(rindex);

      const shade = this.computeOcclusion(partition, rx, ry, rz) * 16;

      const windex = this.worldInfo.windex(partition.offset.x + rx, partition.offset.y + ry, partition.offset.z + rz);

      visibleBlocks[voffset + 0 | 0] = id;
      visibleBlocks[voffset + 1 | 0] = rindex;
      visibleBlocks[voffset + 2 | 0] = windex;
      visibleBlocks[voffset + 3 | 0] = type;
      visibleBlocks[voffset + 4 | 0] = surroundingBlocks;
      visibleBlocks[voffset + 5 | 0] = colour;
      visibleBlocks[voffset + 6 | 0] = shade;

      id += 1 | 0;
    }

    partition.clearDirty();

    const ret = new Int32Array(id * VALUES_PER_VBLOCK);

    for (let i = 0; i < id * VALUES_PER_VBLOCK; i++) {
      ret[i] = visibleBlocks[i];
    }

    // console.timeEnd('getVisibleBlocks');

    return ret;
  }
}
