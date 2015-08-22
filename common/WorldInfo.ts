/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

module Common {
  export class WorldInfoInterface {
    partitionDimensionsInBlocks: IntVector3;
    worldDimensionsInPartitions: IntVector3;
    partitionBoundaries: Array<any>;
  }

  export class IntVector3 {
    x = 0 | 0;
    y = 0 | 0;
    z = 0 | 0;

    constructor(x: number, y: number, z: number) {
      this.x = x | 0;
      this.y = y | 0;
      this.z = z | 0;
    }

    clone(): IntVector3 {
      return new IntVector3(this.x, this.y, this.z);
    }

    add(v: IntVector3): IntVector3 {
      return new IntVector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v: IntVector3): IntVector3 {
      return new IntVector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mul(v: IntVector3): IntVector3 {
      return new IntVector3(this.x * v.x, this.y * v.y, this.z * v.z);
    }

    clamp(min: IntVector3, max: IntVector3): IntVector3 {
      let x = this.x, y = this.y, z = this.z;

      if (this.x < min.x) {
        x = min.x;
      } else if (this.x > max.x) {
        x = max.x;
      }

      if (this.y < min.y) {
        y = min.y;
      } else if (this.y > max.y) {
        y = max.y;
      }

      if (this.z < min.z) {
        z = min.z;
      } else if (this.z > max.z) {
        z = max.z;
      }

      return new IntVector3(x, y, z);
    }
  }

  export class WorldInfo {
    partitionDimensionsInBlocks: IntVector3;
    worldDimensionsInPartitions: IntVector3;
    worldDimensionsInBlocks: IntVector3;
    partitionBoundaries: Array<any>;
    partitionCapacity: number;
    worldCapacity: number;
    worldPartitionCapacity: number;

    WPX = 0 | 0; WPY = 0 | 0; WPZ = 0 | 0;  // World partition dimensions
    PBX = 0 | 0; PBY = 0 | 0; PBZ = 0 | 0;  // Partition block dimensions
    WBX = 0 | 0; WBY = 0 | 0; WBZ = 0 | 0;  // World block dimensions

    constructor(vars: WorldInfoInterface) {
      const wdip = vars.worldDimensionsInPartitions;
      const pdib = vars.partitionDimensionsInBlocks;

      this.worldDimensionsInPartitions = new IntVector3(wdip.x | 0, wdip.y | 0, wdip.z | 0);
      this.partitionDimensionsInBlocks = new IntVector3(pdib.x | 0, pdib.y | 0, pdib.z | 0);
      this.partitionBoundaries = vars.partitionBoundaries;

      this.WPX = this.log2(wdip.x);
      this.WPY = this.log2(wdip.y);
      this.WPZ = this.log2(wdip.z);

      this.PBX = this.log2(pdib.x);
      this.PBY = this.log2(pdib.y);
      this.PBZ = this.log2(pdib.z);

      this.WBX = this.WPX + this.PBX; this.WBY = this.WPY + this.PBY; this.WBZ = this.WPZ + this.PBZ;  // World block dimensions

      this.worldDimensionsInBlocks = this.partitionDimensionsInBlocks.mul(this.worldDimensionsInPartitions);
      this.partitionCapacity = this.partitionDimensionsInBlocks.x * this.partitionDimensionsInBlocks.y * this.partitionDimensionsInBlocks.z;
      this.worldCapacity = this.worldDimensionsInBlocks.x * this.worldDimensionsInBlocks.y * this.worldDimensionsInBlocks.z;
      this.worldPartitionCapacity = this.worldDimensionsInPartitions.x * this.worldDimensionsInPartitions.y * this.worldDimensionsInPartitions.z;
    }

    log2(num: number): number {
      return Math.round(Math.log(num) / Math.log(2)) | 0;
    }

    pindex(px: number, py: number, pz: number): number {
      return (px + (pz << this.WPX)) | 0;
    }

    ppos(pindex: number): IntVector3 {
      const z = (pindex >> (this.WPX + this.WPY)) | 0;
      const y = ((pindex - (z << (this.WPX + this.WPY))) >> this.WPX) | 0;
      const x = (pindex - ((y + (z << this.WPY)) << this.WPX)) | 0;

      return new IntVector3(x, y, z);
    }

    ppos2(ppos: Int32Array, pindex: number) {
      const z = (pindex >> (this.WPX + this.WPY)) | 0;
      const y = ((pindex - (z << (this.WPX + this.WPY))) >> this.WPX) | 0;
      const x = (pindex - ((y + (z << this.WPY)) << this.WPX)) | 0;

      ppos[0] = x;
      ppos[1] = y;
      ppos[2] = z;
    }

    pposw(wx: number, wy: number, wz: number): IntVector3 {
      const px = (wx >> this.PBX) | 0;
      const py = (wy >> this.PBY) | 0;
      const pz = (wz >> this.PBZ) | 0;

      return new IntVector3(px, py, pz);
    }

    pposw2(ppos: Int32Array, wpos: Int32Array) {
      const px = (wpos[0] >> this.PBX) | 0;
      const py = (wpos[1] >> this.PBY) | 0;
      const pz = (wpos[2] >> this.PBZ) | 0;

      ppos[0] = px;
      ppos[1] = py;
      ppos[2] = pz;
    }

    rposw(wx: number, wy: number, wz: number): IntVector3 {
      const mx = (wx >> this.PBX) << this.PBX;
      const my = (wy >> this.PBY) << this.PBY;
      const mz = (wz >> this.PBZ) << this.PBZ;

      const rx = (wx - mx) | 0;
      const ry = (wy - my) | 0;
      const rz = (wz - mz) | 0;

      return new IntVector3(rx, ry, rz);
    }

    rposw2(rpos: Int32Array, wpos: Int32Array) {
      const mx = (wpos[0] >> this.PBX) << this.PBX;
      const my = (wpos[1] >> this.PBY) << this.PBY;
      const mz = (wpos[2] >> this.PBZ) << this.PBZ;

      const rx = (wpos[0] - mx) | 0;
      const ry = (wpos[1] - my) | 0;
      const rz = (wpos[2] - mz) | 0;

      rpos[0] = rx;
      rpos[1] = ry;
      rpos[2] = rz;
    }

    rindex(rx: number, ry: number, rz: number): number {
      return (rx + ((ry + (rz << this.PBY)) << this.PBX)) | 0;
    }

    rpos(rindex: number): IntVector3 {
      const z = (rindex >> (this.PBX + this.PBY)) | 0;
      const y = ((rindex - (z << (this.PBX + this.PBY))) >> this.PBX) | 0;
      const x = (rindex - ((y + (z << this.PBY)) << this.PBX)) | 0;

      return new IntVector3(x, y, z);
    }

    rpos2(rpos: Int32Array, rindex: number) {
      const z = (rindex >> (this.PBX + this.PBY)) | 0;
      const y = ((rindex - (z << (this.PBX + this.PBY))) >> this.PBX) | 0;
      const x = (rindex - ((y + (z << this.PBY)) << this.PBX)) | 0;

      rpos[0] = x;
      rpos[1] = y;
      rpos[2] = z;
    }

    wpos(windex: number): IntVector3 {
      const z = (windex >> (this.WBX + this.WBY)) | 0;
      const y = ((windex - (z << (this.WBX + this.WBY))) >> this.WBX) | 0;
      const x = (windex - ((y + (z << this.WBY)) << this.WBX)) | 0;

      return new IntVector3(x, y, z);
    }

    wpos2(wpos: Int32Array, windex: number) {
      const z = (windex >> (this.WBX + this.WBY)) | 0;
      const y = ((windex - (z << (this.WBX + this.WBY))) >> this.WBX) | 0;
      const x = (windex - ((y + (z << this.WBY)) << this.WBX)) | 0;

      wpos[0] = x;
      wpos[1] = y;
      wpos[2] = z;
    }

    windex(wx: number, wy: number, wz: number): number {
      return (wx + ((wy + (wz << this.WBY)) << this.WBX)) | 0;
    }

    vppos(px: number, py: number, pz: number): boolean {
      if (px < 0 || py < 0 || pz < 0) return false;

      if (px >= this.worldDimensionsInPartitions.x) return false;
      if (py >= this.worldDimensionsInPartitions.y) return false;
      if (pz >= this.worldDimensionsInPartitions.z) return false;

      return true;
    }
  }

  export interface ChangeHandlerOptions {
    start: THREE.Vector3;
    end: THREE.Vector3;
  }

  export interface Change {
    position: THREE.Vector3;
    from: {
      type: number,
      colour: number
    };
    to: {
      type: number,
      colour: number
    };
  }

  export function ensureStartEndOrder(start: IntVector3, end: IntVector3): IntVector3[] {
    const x1 = Math.min(start.x, end.x);
    const x2 = Math.max(start.x, end.x);

    const y1 = Math.min(start.y, end.y);
    const y2 = Math.max(start.y, end.y);

    const z1 = Math.min(start.z, end.z);
    const z2 = Math.max(start.z, end.z);

    return [new IntVector3(x1, y1, z1), new IntVector3(x2, y2, z2)];
  }

  // export function getPartitionForPosition(worldInfo: WorldInfo, position: number[]): THREE.Vector3 {
  //   const px = (position[0] / worldInfo.partitionDimensionsInBlocks.x) | 0;
  //   const py = (position[1] / worldInfo.partitionDimensionsInBlocks.y) | 0;
  //   const pz = (position[2] / worldInfo.partitionDimensionsInBlocks.z) | 0;
  //
  //   return new THREE.Vector3(px, py, pz);
  // }
}

export default Common;
