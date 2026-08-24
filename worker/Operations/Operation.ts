/// <reference path="../../typings/index.d.ts" />
import type { WorldInfo } from '../../common/WorldInfo';
export interface OperationResult {
  buffer: Uint8Array;
  ids: Uint32Array;
}

export class Operation {
  worldInfo: WorldInfo;

  constructor(worldInfo: WorldInfo) {
    this.worldInfo = worldInfo;
  }

  getAffectedPartitionIndices(): number[] {
    throw new Error('Not implemented');
  }

  getBlocks(_pindex: number): OperationResult {
    throw new Error('Not implemented');
  }
}
