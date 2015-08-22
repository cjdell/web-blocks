/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../common/WorldInfo';
import PartitionGeometry from './PartitionGeometry';
import World from './World';

export interface PartitionGeometryResult {
  data: any;
  offset: com.IntVector3;
}

export default class WorldGeometry {
  worldInfo: com.WorldInfo;
  world: World
  partitionGeometries: PartitionGeometry[];

  constructor(worldInfo: com.WorldInfo, world: World) {
    this.worldInfo = worldInfo;
    this.world = world;
    this.partitionGeometries = <PartitionGeometry[]>new Array(world.getPartitionCapacity());
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
