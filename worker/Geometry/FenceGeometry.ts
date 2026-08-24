import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WorldInfo } from '../../common/WorldInfo';
import { Geometry } from './Geometry';

export class FenceGeometry extends Geometry {
  constructor(worldInfo: WorldInfo) {
    super(worldInfo);
  }

  init(): Promise<void> {
    // THREE.Geometry (and its .merge / .fromGeometry helpers) was removed in
    // three r125+. Build the fence from modern BufferGeometries instead: a
    // top bar and two posts, transformed the same way the old code did
    // (scale then translate: M = T * S).
    const mat = new THREE.Matrix4();

    const bar = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    mat.makeScale(1.0, 0.1, 0.1);
    mat.setPosition(0.5, 0.5, 0.5);
    bar.applyMatrix4(mat);

    const postLeft = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    mat.makeScale(0.1, 0.5, 0.1);
    mat.setPosition(0.05 + 1 / 5, 0.25, 0.5);
    postLeft.applyMatrix4(mat);

    const postRight = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    mat.makeScale(0.1, 0.5, 0.1);
    mat.setPosition(0.95 - 1 / 5, 0.25, 0.5);
    postRight.applyMatrix4(mat);

    this.template = mergeGeometries([bar, postLeft, postRight]);

    return Promise.resolve();
  }
}
