/// <reference path="../../typings/index.d.ts" />
import * as THREE from 'three';
import type { IntVector3 } from '../../common/WorldInfo';
import WorkerInterface from '../WorkerInterface';

export interface Context {
  scene: THREE.Scene;
  type: number;
  workerInterface: WorkerInterface;
  getPositionOfMouseAlongXZPlane(xPlane: number, zPlane: number): THREE.Vector3;
  finished(): void;
}

export interface Tool {
  onMouseClick(mouse: THREE.Vector2, pos: IntVector3, side: number): void;
  onMouseMove(mouse: THREE.Vector2, pos: IntVector3, side: number): void;
  cancel(): void;
}
