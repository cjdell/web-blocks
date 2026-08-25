import { IntVector3, ensureStartEndOrder, type WorldInfo } from '../../common/WorldInfo';
import { Operation, OperationResult } from './Operation';

export interface CuboidOptions {
  start: IntVector3;
  end: IntVector3;
  type: number;
  colour: number;
}

export class CuboidOperation extends Operation {
  options: CuboidOptions;

  constructor(worldInfo: WorldInfo, options: CuboidOptions) {
    super(worldInfo);

    this.options = options;

    [this.options.start, this.options.end] = ensureStartEndOrder(
      this.options.start,
      this.options.end,
    );
  }

  getAffectedPartitionIndices(): number[] {
    const {
      x: px1,
      y: py1,
      z: pz1,
    } = this.worldInfo.partitionFromWorld(
      this.options.start.x,
      this.options.start.y,
      this.options.start.z,
    );
    const {
      x: px2,
      y: py2,
      z: pz2,
    } = this.worldInfo.partitionFromWorld(
      this.options.end.x,
      this.options.end.y,
      this.options.end.z,
    );

    const indices = new Array<number>();

    for (let px = px1; px <= px2; px++) {
      for (let py = py1; py <= py2; py++) {
        for (let pz = pz1; pz <= pz2; pz++) {
          const partitionIndex = this.worldInfo.partitionIndex(px, py, pz);
          indices.push(partitionIndex);
        }
      }
    }

    return indices;
  }

  getBlocks(pindex: number): OperationResult {
    const ppos = this.worldInfo.partitionPosition(pindex);

    // These are the partition boundaries
    const pstart = ppos.mul(this.worldInfo.partitionDimensionsInBlocks);
    const pend = pstart
      .add(this.worldInfo.partitionDimensionsInBlocks)
      .sub(new IntVector3(1, 1, 1));

    // We only want the start and end that exists within the boundaries of this partition
    const start = this.options.start.clamp(pstart, pend);
    const end = this.options.end.clamp(pstart, pend);

    const blocks = (1 + end.x - start.x) * (1 + end.y - start.y) * (1 + end.z - start.z);

    const buffer = new Uint8Array(blocks * 2);
    const ids = new Uint32Array(blocks);

    let blockNumber = 0;

    for (let wz = start.z; wz <= end.z; wz++) {
      for (let wy = start.y; wy <= end.y; wy++) {
        for (let wx = start.x; wx <= end.x; wx++) {
          const rpos = this.worldInfo.localFromWorld(wx, wy, wz);
          const rindex = this.worldInfo.localIndex(rpos.x, rpos.y, rpos.z);

          buffer[blockNumber * 2 + 0] = this.options.type;
          buffer[blockNumber * 2 + 1] = this.options.colour;

          ids[blockNumber] = rindex;

          blockNumber++;
        }
      }
    }

    return { buffer, ids };
  }
}
