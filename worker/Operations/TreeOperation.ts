/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';
import { Operation, OperationResult } from './Operation';

export interface TreeOptions {
  pos: com.IntVector3;
}

const TREE = [
  [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ],
  [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ],
  [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ],
  [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0]
  ],
  [
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0]
  ],
  [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0]
  ]
];

export class TreeOperation extends Operation {
  options: TreeOptions;

  constructor(worldInfo: com.WorldInfo, options: TreeOptions) {
    super(worldInfo);

    this.options = options;
  }

  getAffectedPartitionIndices(): number[] {
    const start = this.options.pos.sub(new com.IntVector3(2, 0, 2));
    const end = this.options.pos.add(new com.IntVector3(2, 0, 2));

    const { x: px1, y: py1, z: pz1 } = this.worldInfo.pposw(start.x, start.y, start.z);
    const { x: px2, y: py2, z: pz2 } = this.worldInfo.pposw(end.x, end.y, end.z);

    const indices = new Array<number>();

    for (let px = px1; px <= px2; px++) {
      for (let py = py1; py <= py2; py++) {
        for (let pz = pz1; pz <= pz2; pz++) {
          const partitionIndex = this.worldInfo.pindex(px, py, pz);
          indices.push(partitionIndex);
        }
      }
    }

    // console.log('indices', indices);

    return indices;
  }

  getBlocks(pindex: number): OperationResult {
    const ppos = this.worldInfo.ppos(pindex);

    // These are the partition boundaries
    const pstart = ppos.mul(this.worldInfo.partitionDimensionsInBlocks);
    const pend = pstart.add(this.worldInfo.partitionDimensionsInBlocks).sub(new com.IntVector3(1, 1, 1));

    let start = this.options.pos.sub(new com.IntVector3(2, 0, 2));
    let end = this.options.pos.add(new com.IntVector3(2, 0, 2));

    // We only want the start and end that exists within the boundaries of this partition
    // start = start.clamp(pstart, pend);
    // end = end.clamp(pstart, pend);

    const blocks = 5 * 6 * 5;

    let buffer = new Uint8Array(blocks * 2);
    let ids = new Uint32Array(blocks);

    let blockNumber = 0;

    for (let z = 0; z < 5; z++) {
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 5; x++) {
          const wpos = this.options.pos.add(new com.IntVector3(x - 2, y - 0, z - 2));

          if (wpos.x >= pstart.x && wpos.x <= pend.x) {
            if (wpos.y >= pstart.y && wpos.y <= pend.y) {
              if (wpos.z >= pstart.z && wpos.z <= pend.z) {
                const type = TREE[y][z][x];
                const colour = 0;

                if (type > 0) {
                  const rpos = this.worldInfo.rposw(wpos.x, wpos.y, wpos.z);
                  const rindex = this.worldInfo.rindex(rpos.x, rpos.y, rpos.z);

                  buffer[blockNumber * 2 + 0] = type;
                  buffer[blockNumber * 2 + 1] = colour;
                  ids[blockNumber] = rindex;

                  blockNumber += 1;
                }
              }
            }
          }
        }
      }
    }

    buffer = buffer.slice(0, blockNumber * 2);
    ids = ids.slice(0, blockNumber);

    return { buffer, ids };
  }
}
