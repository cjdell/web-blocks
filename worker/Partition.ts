/// <reference path="../typings/index.d.ts" />
import com from '../common/WorldInfo';

const VALUES_PER_BLOCK = 3;

export default class Partition {
  public offset: com.IntVector3;
  public blocks: Uint8Array = null;
  public index: number;
  public capacity: number;
  public occupied = 0;
  public heightMap: Uint8Array;

  private worldInfo: com.WorldInfo;
  private partitionPosition: com.IntVector3;

  private dirty = false;
  private edgeDirty = [false, false, false, false]; // x, x, z, z 

  constructor(worldInfo: com.WorldInfo, ppos: com.IntVector3) {
    this.worldInfo = worldInfo;
    this.partitionPosition = ppos;

    this.index = this.worldInfo.pindex(ppos.x, ppos.y, ppos.z);
    this.capacity = this.worldInfo.partitionCapacity;

    this.offset = new com.IntVector3(
      ppos.x * this.worldInfo.partitionDimensionsInBlocks.x,
      ppos.y * this.worldInfo.partitionDimensionsInBlocks.y,
      ppos.z * this.worldInfo.partitionDimensionsInBlocks.z
    );

    this.dirty = false;
    this.edgeDirty = [false, false, false, false];

    this.occupied = 0;   // Total of everything that isn't air

    this.heightMap = new Uint8Array(
      this.worldInfo.partitionDimensionsInBlocks.x *
      this.worldInfo.partitionDimensionsInBlocks.z
    );
  }

  init(): void {
    this.blocks = new Uint8Array(this.capacity * VALUES_PER_BLOCK);
  }

  getBlockWithIndex(rindex: number): number {
    return this.blocks[VALUES_PER_BLOCK * rindex + 0];
  }

  getBlock(rx: number, ry: number, rz: number): Uint8Array {
    const index = this.worldInfo.rindex(rx, ry, rz);

    return new Uint8Array([this.blocks[VALUES_PER_BLOCK * index]]);
  }

  setBlock(px: number, py: number, pz: number, type: number, colour: number): void {
    this.rangeCheck(px, py, pz);

    this.checkEdgeDirty(px, pz);

    this.setBlockWithIndex(this.worldInfo.rindex(px, py, pz), type, colour);
  }

  setBlocks(start: com.IntVector3, end: com.IntVector3, type: number, colour: number): void {
    this.rangeCheck(start.x, start.y, start.z);
    this.rangeCheck(end.x, end.y, end.z);

    this.checkEdgeDirty(start.x, start.z);
    this.checkEdgeDirty(end.x, end.z);

    for (let z = start.z; z <= end.z; z++) {
      for (let y = start.y; y <= end.y; y++) {
        let index = this.worldInfo.rindex(start.x, y, z);

        for (let x = start.x; x <= end.x; x++ , index++) {
          this.setBlockWithIndex(index, type, 0);
        }
      }
    }
  }

  isDirty(): boolean {
    return this.dirty;
  }

  isEdgeDirty(edge: number): boolean {
    return this.edgeDirty[edge];
  }

  clearDirty() {
    this.dirty = false;
    this.edgeDirty = [false, false, false, false];
  }

  updateHeightMap() {
    for (let z = 0; z < this.worldInfo.partitionDimensionsInBlocks.z; z++) {
      const index = z * this.worldInfo.partitionDimensionsInBlocks.x;

      for (let x = 0; x < this.worldInfo.partitionDimensionsInBlocks.x; x++) {
        this.heightMap[index + x] = this.getHighestPoint(x, z);
      }
    }
  }

  getHighestPoint(x: number, z: number) {
    for (let y = this.worldInfo.partitionDimensionsInBlocks.y - 1; y >= 0; y--) {
      const index = this.worldInfo.rindex(x, y, z);

      if (this.blocks[VALUES_PER_BLOCK * index] !== 0) return y;
    }

    return 0;
  }

  isInited(): boolean {
    return this.blocks !== null;
  }

  private setBlockWithIndex(index: number, type: number, colour: number): void {
    const offset = VALUES_PER_BLOCK * index;

    const currentType = this.blocks[offset + 0];
    const currentColour = this.blocks[offset + 1];

    if (currentType === type && currentColour === colour) return;

    this.blocks[offset + 0] = type;
    this.blocks[offset + 1] = colour | 0;

    if (currentType === 0) {
      this.occupied += 1;
    } else if (type === 0) {
      this.occupied -= 1;
    }

    this.dirty = true;
  }

  private rangeCheck(px: number, py: number, pz: number) {
    if (px < 0 || py < 0 || pz < 0) throw new Error('Out of range');

    if (
      px >= this.worldInfo.partitionDimensionsInBlocks.x ||
      py >= this.worldInfo.partitionDimensionsInBlocks.y ||
      pz >= this.worldInfo.partitionDimensionsInBlocks.z) {
      throw new Error('Out of range');
    }
  }

  private checkEdgeDirty(px: number, pz: number) {
    if (px === 0) {
      this.edgeDirty[0] = true;
    }

    if (pz === 0) {
      this.edgeDirty[2] = true;
    }

    if (px === this.worldInfo.partitionDimensionsInBlocks.x - 1) {
      this.edgeDirty[1] = true;
    }

    if (pz === this.worldInfo.partitionDimensionsInBlocks.z - 1) {
      this.edgeDirty[3] = true;
    }
  }
}
