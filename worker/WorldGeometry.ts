import type { WorldInfo } from '../common/WorldInfo';
import type { PartitionGeometryData } from '../common/WorkerProtocol';
import PartitionGeometry from './PartitionGeometry';
import World from './World';

export default class WorldGeometry {
  worldInfo: WorldInfo;
  world: World;
  partitionGeometries: PartitionGeometry[];

  constructor(worldInfo: WorldInfo, world: World) {
    this.worldInfo = worldInfo;
    this.world = world;
    this.partitionGeometries = new Array<PartitionGeometry>(world.getPartitionCapacity());
  }

  getPartitionGeometry(partitionIndex: number): PartitionGeometryData {
    let partitionGeometry = this.partitionGeometries[partitionIndex];

    if (!partitionGeometry) {
      const partition = this.world.getPartitionByIndex(partitionIndex);

      partitionGeometry = new PartitionGeometry(this.worldInfo, partition, this.world);

      this.partitionGeometries[partitionIndex] = partitionGeometry;
    }

    partitionGeometry.generateGeometry();

    return {
      data: partitionGeometry.getData(),
      // The offset is an IntVector3 here, but it crosses the boundary as
      // plain {x, y, z} data (see PartitionGeometryData).
      offset: partitionGeometry.getOffset(),
    };
  }
}
