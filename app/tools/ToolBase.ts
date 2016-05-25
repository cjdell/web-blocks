"use strict";
/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';
import WorkerInterface from '../WorkerInterface';

export interface Context {
  scene: THREE.Scene;
  type: number;
  workerInterface: WorkerInterface;
  getPositionOfMouseAlongXZPlane(xPlane: number, zPlane: number): THREE.Vector3;
  finished(): void;
}

export interface Tool {
  onMouseClick(mouse: THREE.Vector2, pos: com.IntVector3, side: number): void;
  onMouseMove(mouse: THREE.Vector2, pos: com.IntVector3, side: number): void;
  cancel(): void;
}
