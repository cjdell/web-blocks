/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';
import { Context, Tool } from './ToolBase';

export default class CuboidTool {
  context: Context;

  state = 'select-start';
  startPos: com.IntVector3 = null;
  endPos: com.IntVector3 = null;
  heightPos: com.IntVector3 = null;
  initialMouseHeight: number = null;
  relMouseHeight: number = null;
  cube: THREE.Mesh = null;

  constructor(context: Context) {
    this.context = context;
  }

  onBlockClick(pos: com.IntVector3): void {

  }

  onMouseClick(mouse: THREE.Vector2, pos: com.IntVector3): void {
    if (this.state === 'select-start') {
      this.startPos = pos;
      this.cube = this.addCube(pos);
      this.state = 'select-end';
    } else if (this.state === 'select-end') {
      this.endPos = pos.clone();
      this.endPos.y = this.startPos.y;
      this.heightPos = pos.clone();
      this.scaleCube(this.cube, this.startPos, this.endPos);
      const currentMouseHeight = this.context.getPositionOfMouseAlongXZPlane(this.endPos.x, this.endPos.z).y;
      this.initialMouseHeight = currentMouseHeight;
      this.relMouseHeight = 0;
      this.state = 'select-height';
    } else if (this.state === 'select-height') {
      this.context.finished();
      this.heightPos.y = this.endPos.y + this.relMouseHeight;
      this.context.workerInterface.setBlocks(this.startPos, this.heightPos, this.context.type, 0, true);
      this.removeCube(this.cube);
    }
  }

  onMouseMove(mouse: THREE.Vector2, pos: com.IntVector3): void {
    if (this.state === 'select-end') {
      // console.log(pos);
      this.endPos = pos.clone();
      this.endPos.y = this.startPos.y;
      this.scaleCube(this.cube, this.startPos, this.endPos);
    } else if (this.state === 'select-height') {
      const currentMouseHeight = this.context.getPositionOfMouseAlongXZPlane(this.endPos.x, this.endPos.z).y;
      this.relMouseHeight = currentMouseHeight - this.initialMouseHeight;
      this.heightPos.y = this.endPos.y + this.relMouseHeight;
      this.scaleCube(this.cube, this.startPos, this.heightPos);
    }
  }

  cancel(): void {
    this.removeCube(this.cube);
  }

  addCube(pos: com.IntVector3) {
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshLambertMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    var cube = new THREE.Mesh(geometry, material);

    cube.position.x = pos.x + 0.5;
    cube.position.y = pos.y + 0.5;
    cube.position.z = pos.z + 0.5;

    cube.rotation.x = Math.PI / 2;

    cube.name = 'selection-cube';

    this.context.scene.add(cube);

    return cube;
  }

  scaleCube(cube: THREE.Mesh, fromPos: com.IntVector3, toPos: com.IntVector3) {
    fromPos = fromPos.clone();
    toPos = toPos.clone();

    if (fromPos.x > toPos.x) {
      var x = fromPos.x;
      fromPos.x = toPos.x;
      toPos.x = x;
    }

    if (fromPos.y > toPos.y) {
      var y = fromPos.y;
      fromPos.y = toPos.y;
      toPos.y = y;
    }

    if (fromPos.z > toPos.z) {
      var z = fromPos.z;
      fromPos.z = toPos.z;
      toPos.z = z;
    }

    var size = toPos.sub(fromPos);

    size = size.clone();

    size.x += size.x >= 0 ? 1 : -1;
    size.y += size.y >= 0 ? 1 : -1;
    size.z += size.z >= 0 ? 1 : -1;

    cube.position.x = fromPos.x + size.x / 2;
    cube.position.y = fromPos.y + size.y / 2;
    cube.position.z = fromPos.z + size.z / 2;

    cube.scale.x = size.x + 0.1;
    cube.scale.z = size.y + 0.1;
    cube.scale.y = size.z + 0.1;
  }

  removeCube(cube: THREE.Mesh) {
    this.context.scene.remove(cube);
  }
}
