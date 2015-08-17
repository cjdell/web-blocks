/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

module Common {
  const WPX = 5, WPY = 0, WPZ = 5;  // World partition dimensions
  const PBX = 4, PBY = 5, PBZ = 4;  // Partition block dimensions
  const WBX = WPX + PBX, WBY = WPY + PBY, WBZ = WPZ + PBZ;  // World block dimensions

  export class WorldInfoInterface {
    partitionDimensionsInBlocks: THREE.Vector3;
    worldDimensionsInPartitions: THREE.Vector3;
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
    partitionDimensionsInBlocks: THREE.Vector3;
    worldDimensionsInPartitions: THREE.Vector3;
    worldDimensionsInBlocks: THREE.Vector3;
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

      this.worldDimensionsInPartitions = new THREE.Vector3(wdip.x | 0, wdip.y | 0, wdip.z | 0);
      this.partitionDimensionsInBlocks = new THREE.Vector3(pdib.x | 0, pdib.y | 0, pdib.z | 0);
      this.partitionBoundaries = vars.partitionBoundaries;

      this.WPX = this.log2(wdip.x);
      this.WPY = this.log2(wdip.y);
      this.WPY = this.log2(wdip.z);

      this.PBX = this.log2(pdib.x);
      this.PBY = this.log2(pdib.y);
      this.PBZ = this.log2(pdib.z);

      this.WBX = this.WPX + this.PBX; this.WBY = this.WPY + this.PBY; this.WBZ = this.WPZ + this.PBZ;  // World block dimensions

      this.worldDimensionsInBlocks = this.partitionDimensionsInBlocks.clone().multiply(this.worldDimensionsInPartitions);
      this.partitionCapacity = this.partitionDimensionsInBlocks.x * this.partitionDimensionsInBlocks.y * this.partitionDimensionsInBlocks.z;
      this.worldCapacity = this.worldDimensionsInBlocks.x * this.worldDimensionsInBlocks.y * this.worldDimensionsInBlocks.z;
      this.worldPartitionCapacity = this.worldDimensionsInPartitions.x * this.worldDimensionsInPartitions.y * this.worldDimensionsInPartitions.z;
    }

    log2(num: number): number {
      return Math.round(Math.log(num) / Math.log(2)) | 0;
    }

    // pindex([px, py, pz]: number[]): number {
    //   return (px + (pz << this.WPX))| 0;
    // }

    pindex2(px: number, py: number, pz: number): number {
      return (px + (pz << this.WPX)) | 0;
    }

    // ppos([wx, wy, wz]: number[]): number[] {
    //   const px = (wx >> this.PBX) | 0;
    //   const py = (wy >> this.PBY) | 0;
    //   const pz = (wz >> this.PBZ) | 0;
    //
    //   return [px, py, pz];
    // }

    ppos2(wx: number, wy: number, wz: number): IntVector3 {
      const px = (wx >> this.PBX) | 0;
      const py = (wy >> this.PBY) | 0;
      const pz = (wz >> this.PBZ) | 0;

      return new IntVector3(px, py, pz);
    }

    // rposw([wx, wy, wz]: number[]): number[] {
    //   const [px, py, pz] = this.ppos([wx, wy, wz]);
    //
    //   const rx = (wx - (px << this.PBX)) | 0;
    //   const ry = (wy - (py << this.PBY)) | 0;
    //   const rz = (wz - (pz << this.PBZ)) | 0;
    //
    //   return [rx, ry, rz];
    // }

    rposw2(wx: number, wy: number, wz: number): IntVector3 {
      const mx = (wx >> this.PBX) << this.PBX;
      const my = (wy >> this.PBY) << this.PBY;
      const mz = (wz >> this.PBZ) << this.PBZ;

      const rx = (wx - mx) | 0;
      const ry = (wy - my) | 0;
      const rz = (wz - mz) | 0;

      return new IntVector3(rx, ry, rz);
    }

    // rindex([rx, ry, rz]: number[]): number {
    //   return (rx + ((ry + (rz << this.PBY)) << this.PBX)) | 0;
    // }

    rindex2(rx: number, ry: number, rz: number): number {
      return (rx + ((ry + (rz << this.PBY)) << this.PBX)) | 0;
    }

    // rpos(rindex: number): number[] {
    //   const z = (rindex >> (this.PBX + this.PBY)) | 0;
    //   const y = ((rindex - (z << (this.PBX + this.PBY))) >> this.PBX) | 0;
    //   const x = (rindex - ((y + (z << this.PBY)) << this.PBX)) | 0;
    //
    //   return [x, y, z];
    // }

    rpos2(rindex: number): IntVector3 {
      const z = (rindex >> (this.PBX + this.PBY)) | 0;
      const y = ((rindex - (z << (this.PBX + this.PBY))) >> this.PBX) | 0;
      const x = (rindex - ((y + (z << this.PBY)) << this.PBX)) | 0;

      return new IntVector3(x, y, z);
    }

    // wpos(windex: number): number[] {
    //   const z = (windex >> (this.WBX + this.WBY)) | 0;
    //   const y = ((windex - (z << (this.WBX + this.WBY))) >> this.WBX) | 0;
    //   const x = (windex - ((y + (z << this.WBY)) << this.WBX)) | 0;
    //
    //   return [x, y, z];
    // }

    wpos2(windex: number): IntVector3 {
      const z = (windex >> (this.WBX + this.WBY)) | 0;
      const y = ((windex - (z << (this.WBX + this.WBY))) >> this.WBX) | 0;
      const x = (windex - ((y + (z << this.WBY)) << this.WBX)) | 0;

      return new IntVector3(x, y, z);
    }

    // windex([wx, wy, wz]: number[]): number {
    //   return (wx + ((wy + (wz << this.WBY)) << this.WBX)) | 0;
    // }

    windex2(wx: number, wy: number, wz: number): number {
      return (wx + ((wy + (wz << this.WBY)) << this.WBX)) | 0;
    }

    // vppos([px, py, pz]: number[]): boolean {
    //   if (px < 0 || py < 0 || pz < 0) return false;
    //
    //   if (px >= this.worldDimensionsInPartitions.x) return false;
    //   if (py >= this.worldDimensionsInPartitions.y) return false;
    //   if (pz >= this.worldDimensionsInPartitions.z) return false;
    //
    //   return true;
    // }

    vppos2(px: number, py: number, pz: number): boolean {
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
