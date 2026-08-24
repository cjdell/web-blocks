/// <reference path="../typings/index.d.ts" />
import type { WorldInfo } from '../common/WorldInfo';
import type { PlainVector3 } from '../common/Types';
import PartitionGeometry from './PartitionGeometry';
import { VertexData } from './PartitionGeometry';
import World from './World';

export interface PartitionGeometryResult {
  data: VertexData;
  // The offset is an IntVector3 on the worker, but it crosses the boundary
  // as plain {x, y, z} data.
  offset: PlainVector3;
}

export default class WorldGeometry {
  worldInfo: WorldInfo;
  world: World;
  partitionGeometries: PartitionGeometry[];

  constructor(worldInfo: WorldInfo, world: World) {
    this.worldInfo = worldInfo;
    this.world = world;
    this.partitionGeometries = new Array<PartitionGeometry>(world.getPartitionCapacity());
  }

  getPartitionGeometry(partitionIndex: number): PartitionGeometryResult {
    let partitionGeometry = this.partitionGeometries[partitionIndex];

    if (!partitionGeometry) {
      const partition = this.world.getPartitionByIndex(partitionIndex);

      partitionGeometry = new PartitionGeometry(this.worldInfo, partition, this.world);

      this.partitionGeometries[partitionIndex] = partitionGeometry;
    }

    partitionGeometry.generateGeometry();

    return {
      data: partitionGeometry.getData(),
      offset: partitionGeometry.getOffset()
    };
  }
}
