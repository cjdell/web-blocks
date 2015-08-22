/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import Partition from '../Partition';
import com from '../../common/WorldInfo';

export default class Command {
  worldInfo: com.WorldInfo
  version: number;
  options: any;

  constructor(worldInfo: com.WorldInfo, version: number, options: any) {
    this.worldInfo = worldInfo;
    this.version = version;
    this.options = options;
  }

  getAffectedPartitionIndices(): number[] {
    throw new Error('Not implemented');
  }

  redo(partition: Partition): void {
    throw new Error('Not implemented');
  }

  undo(partition: Partition): void {
    throw new Error('Not implemented');
  }

  toJSON(): any {
    return {
      name: (<any>this.constructor).name,
      options: this.options
    };
  }
}
