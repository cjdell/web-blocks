/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

module Common {
  export interface WorldInfo {
    partitionDimensionsInBlocks: THREE.Vector3;
    worldDimensionsInPartitions: THREE.Vector3;
  }

  export function ensureStartEndOrder(start: THREE.Vector3, end: THREE.Vector3): void {
    var x1 = Math.min(start.x, end.x);
    var x2 = Math.max(start.x, end.x);

    var y1 = Math.min(start.y, end.y);
    var y2 = Math.max(start.y, end.y);

    var z1 = Math.min(start.z, end.z);
    var z2 = Math.max(start.z, end.z);

    start.set(x1, y1, z1);
    end.set(x2, y2, z2);
  }

  export function getPartitionForPosition(worldInfo: WorldInfo, position: THREE.Vector3): THREE.Vector3 {
    var px = (position.x / worldInfo.partitionDimensionsInBlocks.x) | 0;
    var py = (position.y / worldInfo.partitionDimensionsInBlocks.y) | 0;
    var pz = (position.z / worldInfo.partitionDimensionsInBlocks.z) | 0;

    return new THREE.Vector3(px, py, pz);
  }

  export function getPartitionIndex(worldInfo: WorldInfo, position: THREE.Vector3): number {
    return position.x + worldInfo.worldDimensionsInPartitions.x * (position.y + worldInfo.worldDimensionsInPartitions.y * position.z);
  }
}

export default Common;
