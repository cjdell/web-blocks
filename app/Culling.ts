import * as THREE from 'three';
import type { WorldInfo } from '../common/WorldInfo';
export default class Culling {
  active: number[] = [];
  camera: THREE.Camera;
  worldInfo: WorldInfo;

  constructor(camera: THREE.Camera, worldInfo: WorldInfo) {
    this.camera = camera;
    this.worldInfo = worldInfo;
  }

  getVisiblePartitions(): number[] {
    this.camera.updateMatrix();
    this.camera.updateMatrixWorld(false);
    // Matrix4.getInverse was removed; invert() is the modern in-place API.
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

    const frustum = new THREE.Frustum();

    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse,
      ),
    );

    return this.worldInfo.partitionBoundaries
      .filter((partition) => {
        const c1 = partition.points[0];
        const c2 = partition.points[1];

        const box = new THREE.Box3(
          new THREE.Vector3(c1.x, c1.y, c1.z),
          new THREE.Vector3(c2.x, c2.y, c2.z),
        );

        const cam2d = this.camera.position.clone().setY(0);
        // Box3.getCenter now requires a target vector.
        const partCentre = box.getCenter(new THREE.Vector3()).setY(0);

        const dist = cam2d.distanceTo(partCentre);

        if (dist < 128) {
          if (dist < 64) {
            // Immediate proximity
            return true;
          }

          if (frustum.intersectsBox(box)) {
            return true;
          }
        }

        return false;
      })
      .map((partition) => partition.partitionIndex);
  }

  getNewlyVisiblePartitions() {
    const visiblePartitions = this.getVisiblePartitions();

    const toBeAdded = visiblePartitions.filter((index) => !this.active.includes(index));
    const toBeRemoved = this.active.filter((index) => !visiblePartitions.includes(index));

    this.active = visiblePartitions;

    return { toBeAdded, toBeRemoved };
  }
}
