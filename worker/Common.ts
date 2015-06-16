/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

module Common {
  export interface WorldInfo {
    partitionDimensionsInBlocks: THREE.Vector3;
    worldDimensionsInPartitions: THREE.Vector3;
  }

  export function ensureStartEndOrder(start: THREE.Vector3, end: THREE.Vector3): void {
    let x1 = Math.min(start.x, end.x);
    let x2 = Math.max(start.x, end.x);

    let y1 = Math.min(start.y, end.y);
    let y2 = Math.max(start.y, end.y);

    let z1 = Math.min(start.z, end.z);
    let z2 = Math.max(start.z, end.z);

    start.set(x1, y1, z1);
    end.set(x2, y2, z2);
  }

  export function getPartitionForPosition(worldInfo: WorldInfo, position: THREE.Vector3): THREE.Vector3 {
    let px = (position.x / worldInfo.partitionDimensionsInBlocks.x) | 0;
    let py = (position.y / worldInfo.partitionDimensionsInBlocks.y) | 0;
    let pz = (position.z / worldInfo.partitionDimensionsInBlocks.z) | 0;

    return new THREE.Vector3(px, py, pz);
  }

  export function getPartitionIndex(worldInfo: WorldInfo, position: THREE.Vector3): number {
    return position.x + worldInfo.worldDimensionsInPartitions.x * (position.y + worldInfo.worldDimensionsInPartitions.y * position.z);
  }

  export function getBlockIndexWithinPartition(worldInfo: WorldInfo, position: THREE.Vector3): number {
    return position.x + worldInfo.partitionDimensionsInBlocks.x * (position.y + worldInfo.partitionDimensionsInBlocks.y * position.z);
  }

  export function getPositionFromIndex(worldInfo: WorldInfo, index: number): THREE.Vector3 {
    const z = (index / (worldInfo.partitionDimensionsInBlocks.x * worldInfo.partitionDimensionsInBlocks.y)) | 0;
    const y = ((index - z * worldInfo.partitionDimensionsInBlocks.x * worldInfo.partitionDimensionsInBlocks.y) / worldInfo.partitionDimensionsInBlocks.x) | 0;
    const x = index - worldInfo.partitionDimensionsInBlocks.x * (y + worldInfo.partitionDimensionsInBlocks.y * z);

    return new THREE.Vector3(x, y, z);
  }
}

export default Common;
