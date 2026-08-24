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

  // null means "every partition" (the caller falls back to all of them).
  getAffectedPartitionIndices(): number[] | null {
    throw new Error('Not implemented');
  }

  getBlocks(_pindex: number): OperationResult {
    throw new Error('Not implemented');
  }
}
