/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/Common';
import WorkerInterface from '../WorkerInterface';

export interface Context {
  scene: THREE.Scene;
  type: number;
  workerInterface: WorkerInterface;
  getPositionOfMouseAlongXZPlane(xPlane: number, zPlane: number): THREE.Vector3;
  finished(): void;
}

export interface Tool {
  onBlockClick(pos: com.IntVector3): void;
  onMouseClick(mouse: THREE.Vector2, pos: com.IntVector3): void;
  onMouseMove(mouse: THREE.Vector2, pos: com.IntVector3): void;
  cancel(): void;
}
