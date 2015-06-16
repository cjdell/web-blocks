/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import pg from './PartitionGeometry';
import w from './World';

module WorldGeometry {
  export interface WorldGeometry {
    getPartitionGeometry(partitionIndex: number): PartitionGeometryResult;
  }

  export interface PartitionGeometryResult {
    data: any;
    offset: THREE.Vector3;
  }

  export function NewWorldGeometry(world: w.World): WorldGeometry {
    let partitionGeometries = <pg.PartitionGeometry[]>new Array(world.getPartitionCapacity());

    function getPartitionGeometry(partitionIndex: number): PartitionGeometryResult {
      let partitionGeometry = partitionGeometries[partitionIndex];

      if (!partitionGeometry) {
        let partition = world.getPartitionByIndex(partitionIndex);

        partitionGeometry = pg.NewPartitionGeometry(partition);

        partitionGeometries[partitionIndex] = partitionGeometry;
      }

      partitionGeometry.consumeChanges();

      return {
        data: partitionGeometry.getData(),
        offset: partitionGeometry.getOffset()
      };
    }

    return {
      getPartitionGeometry: getPartitionGeometry
    };
  }
}

export default WorldGeometry;
