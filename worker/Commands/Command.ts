/// <reference path="../../typings/index.d.ts" />
import Partition from '../Partition';
import com from '../../common/WorldInfo';

export default class Command {
  worldInfo: com.WorldInfo;
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

  redo(_partition: Partition): void {
    throw new Error('Not implemented');
  }

  undo(_partition: Partition): void {
    throw new Error('Not implemented');
  }

  toJSON(): any {
    return {
      name: (this.constructor as any).name,
      options: this.options
    };
  }
}
