/// <reference path="../typings/tsd.d.ts" />
import _ = require('underscore');
import THREE = require('three');

import com from '../Common/common';

export default class Culling {
  active = new Array<number>();
  camera: THREE.Camera;
  worldInfo: com.WorldInfo;

  constructor(camera: THREE.Camera, worldInfo: com.WorldInfo) {
    this.camera = camera;
    this.worldInfo = worldInfo;
  }

  getVisiblePartitions(): number[] {
    this.camera.updateMatrix(); // make sure camera's local matrix is updated
    this.camera.updateMatrixWorld(false); // make sure camera's world matrix is updated
    this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

    let frustum = new THREE.Frustum();

    frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));

    return this.worldInfo.partitionBoundaries.filter((partition: any) => {
      let visible = false;

      partition.points.forEach((boundaryPoint: any) => {
        let cam2d = new THREE.Vector2(this.camera.position.x, this.camera.position.z);
        let point = new THREE.Vector2(boundaryPoint.x, boundaryPoint.z);

        //if (camera.position.distanceTo(boundaryPoint) < 16) {

        let dist = cam2d.distanceTo(point);

        if (dist < 96) {
          if (dist < 32) {
            // Immediate proximity
            visible = true;
            return;
          }

          if (frustum.containsPoint(boundaryPoint)) {
            if (!visible) visible = true;
          }
        }
      });

      return visible;
    }).map(partition => partition.partitionIndex);
  }

  getNewlyVisiblePartitions() {
    let visiblePartitions = this.getVisiblePartitions();

    let toBeAdded = _.difference(visiblePartitions, this.active);
    let toBeRemoved = _.difference(this.active, visiblePartitions);

    this.active = visiblePartitions;

    return { toBeAdded: toBeAdded, toBeRemoved: toBeRemoved };
  }
}
