"use strict";
/// <reference path="../../typings/index.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';

export interface OperationResult {
  buffer: Uint8Array;
  ids: Uint32Array;
}

export class Operation {
  worldInfo: com.WorldInfo

  constructor(worldInfo: com.WorldInfo) {
    this.worldInfo = worldInfo;
  }

  getAffectedPartitionIndices(): number[] {
    throw new Error('Not implemented');
  }

  getBlocks(pindex: number): OperationResult {
    throw new Error('Not implemented');
  }
}
