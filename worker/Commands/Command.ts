import Partition from '../Partition';
import type { WorldInfo } from '../../common/WorldInfo';
export default class Command {
  worldInfo: WorldInfo;
  version: number;
  options: any;

  constructor(worldInfo: WorldInfo, version: number, options: any) {
    this.worldInfo = worldInfo;
    this.version = version;
    this.options = options;
  }

  // null means "every partition" (the caller falls back to all of them).
  getAffectedPartitionIndices(): number[] | null {
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
