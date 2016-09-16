"use strict";
/// <reference path="../typings/index.d.ts" />
import _ = require('underscore');
import THREE = require('three');

import com from '../common/WorldInfo';

export default class Culling {
  active: number[] = [];
  camera: THREE.Camera;
  worldInfo: com.WorldInfo;

  constructor(camera: THREE.Camera, worldInfo: com.WorldInfo) {
    this.camera = camera;
    this.worldInfo = worldInfo;
  }

  getVisiblePartitions(): number[] {
    this.camera.updateMatrix();
    this.camera.updateMatrixWorld(false);
    this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

    const frustum = new THREE.Frustum();

    frustum.setFromMatrix(
      new THREE.Matrix4().multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      )
    );

    return this.worldInfo.partitionBoundaries.filter(partition => {
      const c1 = partition.points[0];
      const c2 = partition.points[1];

      const box = new THREE.Box3(
        new THREE.Vector3(c1.x, c1.y, c1.z),
        new THREE.Vector3(c2.x, c2.y, c2.z)
      );

      const cam2d = this.camera.position.clone().setY(0);
      const partCentre = box.getCenter().setY(0);

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
    }).map(partition => partition.partitionIndex);
  }

  getNewlyVisiblePartitions() {
    const visiblePartitions = this.getVisiblePartitions();

    const toBeAdded = _.difference(visiblePartitions, this.active);
    const toBeRemoved = _.difference(this.active, visiblePartitions);

    this.active = visiblePartitions;

    return { toBeAdded, toBeRemoved };
  }
}
