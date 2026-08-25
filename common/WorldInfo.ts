import * as THREE from 'three';
import type { PlainVector3 } from './Types';

/**
 * The two corners of a partition's bounding box, in world coordinates.
 *
 * The corners are structural `{x, y, z}` (a THREE.Vector3 satisfies this
 * shape) so the type stays honest when the boundaries cross the worker
 * boundary, where they arrive as plain objects.
 */
export interface PartitionBoundaries {
  partitionIndex: number;
  points: PlainVector3[];
}

/**
 * The plain data a caller hands to the WorldInfo constructor.
 *
 * The dimensions are structural `{x, y, z}` rather than IntVector3 instances
 * on purpose: an IntVector3 satisfies this shape, and so does the
 * structured-cloned worldInfo that comes back over the worker boundary
 * (postMessage strips class identity).
 */
export interface WorldInfoInterface {
  partitionDimensionsInBlocks: PlainVector3;
  worldDimensionsInPartitions: PlainVector3;
  partitionBoundaries: PartitionBoundaries[] | null;
}

// Immutable integer vector
export class IntVector3 {
  x = 0 | 0;
  y = 0 | 0;
  z = 0 | 0;

  constructor(x: number, y: number, z: number) {
    this.x = x | 0;
    this.y = y | 0;
    this.z = z | 0;
  }

  clone() {
    return new IntVector3(this.x, this.y, this.z);
  }

  add(v: IntVector3) {
    return new IntVector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: IntVector3) {
    return new IntVector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  mul(v: IntVector3) {
    return new IntVector3(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  clamp(min: IntVector3, max: IntVector3) {
    let x = this.x,
      y = this.y,
      z = this.z;

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
  partitionBoundaries: PartitionBoundaries[];
  partitionCapacity: number;
  worldCapacity: number;
  worldPartitionCapacity: number;

  // log2 of the number of partitions along each world axis (used for the
  // bit-shifts that pack/unpack partition-grid indices).
  partitionCountLogX = 0 | 0;
  partitionCountLogY = 0 | 0;
  partitionCountLogZ = 0 | 0;

  // log2 of the block dimensions of a single partition.
  partitionBlockLogX = 0 | 0;
  partitionBlockLogY = 0 | 0;
  partitionBlockLogZ = 0 | 0;

  // log2 of the world's block dimensions (partitionCountLog + partitionBlockLog).
  worldBlockLogX = 0 | 0;
  worldBlockLogY = 0 | 0;
  worldBlockLogZ = 0 | 0;

  constructor(vars: WorldInfoInterface) {
    const wdip = vars.worldDimensionsInPartitions;
    const pdib = vars.partitionDimensionsInBlocks;

    this.worldDimensionsInPartitions = new IntVector3(wdip.x | 0, wdip.y | 0, wdip.z | 0);
    this.partitionDimensionsInBlocks = new IntVector3(pdib.x | 0, pdib.y | 0, pdib.z | 0);
    this.partitionBoundaries = vars.partitionBoundaries ?? [];

    this.partitionCountLogX = this.log2(wdip.x);
    this.partitionCountLogY = this.log2(wdip.y);
    this.partitionCountLogZ = this.log2(wdip.z);

    this.partitionBlockLogX = this.log2(pdib.x);
    this.partitionBlockLogY = this.log2(pdib.y);
    this.partitionBlockLogZ = this.log2(pdib.z);

    this.worldBlockLogX = this.partitionCountLogX + this.partitionBlockLogX;
    this.worldBlockLogY = this.partitionCountLogY + this.partitionBlockLogY;
    this.worldBlockLogZ = this.partitionCountLogZ + this.partitionBlockLogZ;

    this.worldDimensionsInBlocks = this.partitionDimensionsInBlocks.mul(
      this.worldDimensionsInPartitions,
    );
    this.partitionCapacity =
      this.partitionDimensionsInBlocks.x *
      this.partitionDimensionsInBlocks.y *
      this.partitionDimensionsInBlocks.z;
    this.worldCapacity =
      this.worldDimensionsInBlocks.x *
      this.worldDimensionsInBlocks.y *
      this.worldDimensionsInBlocks.z;
    this.worldPartitionCapacity =
      this.worldDimensionsInPartitions.x *
      this.worldDimensionsInPartitions.y *
      this.worldDimensionsInPartitions.z;
  }

  log2(num: number): number {
    return Math.round(Math.log(num) / Math.log(2)) | 0;
  }

  // Partition-grid coordinates → flat partition index.
  partitionIndex(px: number, py: number, pz: number): number {
    return (px + (pz << this.partitionCountLogX)) | 0;
  }

  // Flat partition index → partition-grid coordinates.
  partitionPosition(pindex: number): IntVector3 {
    const z = (pindex >> (this.partitionCountLogX + this.partitionCountLogY)) | 0;
    const y =
      ((pindex - (z << (this.partitionCountLogX + this.partitionCountLogY))) >>
        this.partitionCountLogX) |
      0;
    const x = (pindex - ((y + (z << this.partitionCountLogY)) << this.partitionCountLogX)) | 0;

    return new IntVector3(x, y, z);
  }

  partitionPositionInto(out: Int32Array, pindex: number) {
    const z = (pindex >> (this.partitionCountLogX + this.partitionCountLogY)) | 0;
    const y =
      ((pindex - (z << (this.partitionCountLogX + this.partitionCountLogY))) >>
        this.partitionCountLogX) |
      0;
    const x = (pindex - ((y + (z << this.partitionCountLogY)) << this.partitionCountLogX)) | 0;

    out[0] = x;
    out[1] = y;
    out[2] = z;
  }

  // World block coordinates → the partition-grid coordinate that contains them.
  partitionFromWorld(wx: number, wy: number, wz: number): IntVector3 {
    const px = (wx >> this.partitionBlockLogX) | 0;
    const py = (wy >> this.partitionBlockLogY) | 0;
    const pz = (wz >> this.partitionBlockLogZ) | 0;

    return new IntVector3(px, py, pz);
  }

  partitionFromWorldInto(out: Int32Array, wpos: Int32Array) {
    const px = (wpos[0] >> this.partitionBlockLogX) | 0;
    const py = (wpos[1] >> this.partitionBlockLogY) | 0;
    const pz = (wpos[2] >> this.partitionBlockLogZ) | 0;

    out[0] = px;
    out[1] = py;
    out[2] = pz;
  }

  // Is a partition-grid coordinate inside the world's partition range?
  partitionInBounds(px: number, py: number, pz: number): boolean {
    if (px < 0 || py < 0 || pz < 0) return false;

    if (px >= this.worldDimensionsInPartitions.x) return false;
    if (py >= this.worldDimensionsInPartitions.y) return false;
    if (pz >= this.worldDimensionsInPartitions.z) return false;

    return true;
  }

  // Flat partition index → within-partition (local) coordinates.
  localPosition(rindex: number): IntVector3 {
    const z = (rindex >> (this.partitionBlockLogX + this.partitionBlockLogY)) | 0;
    const y =
      ((rindex - (z << (this.partitionBlockLogX + this.partitionBlockLogY))) >>
        this.partitionBlockLogX) |
      0;
    const x = (rindex - ((y + (z << this.partitionBlockLogY)) << this.partitionBlockLogX)) | 0;

    return new IntVector3(x, y, z);
  }

  localPositionInto(out: Int32Array, rindex: number) {
    const z = (rindex >> (this.partitionBlockLogX + this.partitionBlockLogY)) | 0;
    const y =
      ((rindex - (z << (this.partitionBlockLogX + this.partitionBlockLogY))) >>
        this.partitionBlockLogX) |
      0;
    const x = (rindex - ((y + (z << this.partitionBlockLogY)) << this.partitionBlockLogX)) | 0;

    out[0] = x;
    out[1] = y;
    out[2] = z;
  }

  // World block coordinates → within-partition (local) coordinates.
  localFromWorld(wx: number, wy: number, wz: number): IntVector3 {
    const mx = (wx >> this.partitionBlockLogX) << this.partitionBlockLogX;
    const my = (wy >> this.partitionBlockLogY) << this.partitionBlockLogY;
    const mz = (wz >> this.partitionBlockLogZ) << this.partitionBlockLogZ;

    const rx = (wx - mx) | 0;
    const ry = (wy - my) | 0;
    const rz = (wz - mz) | 0;

    return new IntVector3(rx, ry, rz);
  }

  localFromWorldInto(out: Int32Array, wpos: Int32Array) {
    const mx = (wpos[0] >> this.partitionBlockLogX) << this.partitionBlockLogX;
    const my = (wpos[1] >> this.partitionBlockLogY) << this.partitionBlockLogY;
    const mz = (wpos[2] >> this.partitionBlockLogZ) << this.partitionBlockLogZ;

    const rx = (wpos[0] - mx) | 0;
    const ry = (wpos[1] - my) | 0;
    const rz = (wpos[2] - mz) | 0;

    out[0] = rx;
    out[1] = ry;
    out[2] = rz;
  }

  // Within-partition (local) coordinates → flat within-partition index.
  localIndex(rx: number, ry: number, rz: number): number {
    return (rx + ((ry + (rz << this.partitionBlockLogY)) << this.partitionBlockLogX)) | 0;
  }

  // World block coordinates → flat world index.
  worldIndex(wx: number, wy: number, wz: number): number {
    return (wx + ((wy + (wz << this.worldBlockLogY)) << this.worldBlockLogX)) | 0;
  }

  // Flat world index → world block coordinates.
  worldPosition(windex: number): IntVector3 {
    const z = (windex >> (this.worldBlockLogX + this.worldBlockLogY)) | 0;
    const y =
      ((windex - (z << (this.worldBlockLogX + this.worldBlockLogY))) >> this.worldBlockLogX) | 0;
    const x = (windex - ((y + (z << this.worldBlockLogY)) << this.worldBlockLogX)) | 0;

    return new IntVector3(x, y, z);
  }

  worldPositionInto(out: Int32Array, windex: number) {
    const z = (windex >> (this.worldBlockLogX + this.worldBlockLogY)) | 0;
    const y =
      ((windex - (z << (this.worldBlockLogX + this.worldBlockLogY))) >> this.worldBlockLogX) | 0;
    const x = (windex - ((y + (z << this.worldBlockLogY)) << this.worldBlockLogX)) | 0;

    out[0] = x;
    out[1] = y;
    out[2] = z;
  }
}

export interface Change {
  position: THREE.Vector3;
  from: {
    type: number;
    colour: number;
  };
  to: {
    type: number;
    colour: number;
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
