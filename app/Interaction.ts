"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../common/WorldInfo';
import WorkerInterface from './WorkerInterface';
import { Context, Tool } from './tools/ToolBase';
import CuboidTool from './tools/CuboidTool';
import Webcam from './Webcam';

export default class Interaction {
  viewPort: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.Camera;
  workerInterface: WorkerInterface;
  worldInfo: com.WorldInfo;
  webcam: Webcam;

  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

  down = false;
  type = 1;
  tool: Tool = null;

  isDesktop = true; // TODO: Detect mobile

  constructor(viewPort: HTMLElement, scene: THREE.Scene, camera: THREE.Camera, workerInterface: WorkerInterface, worldInfo: com.WorldInfo, webcam: Webcam) {
    this.viewPort = viewPort;
    this.scene = scene;
    this.camera = camera;
    this.workerInterface = workerInterface;
    this.worldInfo = worldInfo;
    this.webcam = webcam;

    if (this.isDesktop) {
      viewPort.addEventListener('mousedown', (e) => this.mouseDown(e), false);
      viewPort.addEventListener('mousemove', (e) => this.mouseMove(e), false);
      viewPort.addEventListener('mouseup', (e) => this.mouseUp(e), false);

      document.addEventListener('keypress', (e) => this.keyPress(e), false);
    }
  }

  keyPress(event: KeyboardEvent) {
    // console.log('keyPress', event.keyCode, event.ctrlKey);
    if (event.keyCode == 26 && event.ctrlKey) {
      // console.log('undo');
      this.workerInterface.undo();
    }
  }

  mouseDown(event: any) {
    this.down = true;
  }

  mouseMove(event: any) {
    this.mouse.x = (event.clientX / this.viewPort.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.viewPort.clientHeight) * 2 + 1;

    let pos = this.getBlockPositionOfMouse();

    if (this.tool) this.tool.onMouseMove.call(this.tool, this.mouse, pos);
  }

  mouseUp(event: any) {
    this.down = false;

    const pos = this.getBlockPositionOfMouse();

    if (!this.tool) {
      const context: Context = {
        scene: this.scene,
        type: this.type,
        workerInterface: this.workerInterface,
        getPositionOfMouseAlongXZPlane: this.getPositionOfMouseAlongXZPlane.bind(this),
        finished: this.finished.bind(this)
      };

      this.tool = new CuboidTool(context);
    }

    if (this.tool) this.tool.onMouseClick.call(this.tool, this.mouse, pos);
  }

  finished() {
    this.tool = null;
  }

  getBlockPositionOfMouse(): com.IntVector3 {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children);

    if (intersects.length > 0) {
      let hitBlock: THREE.Intersection = null;

      let i = 0;

      // Don't detect the selection cube
      while (intersects[i].object.name === 'selection-cube') {
        i++;

        if (i >= intersects.length) return;
      }

      hitBlock = intersects[i];

      const vertexIndex = hitBlock.face.a;

      const offset = this.getOffset(<THREE.Mesh>hitBlock.object, vertexIndex);

      if (!offset) return null;

      const side = this.getSide(<THREE.Mesh>hitBlock.object, vertexIndex);

      // console.log('offset', offset);

      return this.worldInfo.wpos(offset);
    }

    return null;
  }

  getPositionOfMouseAlongXZPlane(xPlane: number, zPlane: number) {
    const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
    vector.unproject(this.camera);

    //dot(vector);

    const dir = vector.sub(this.camera.position).normalize();

    const distancez = (zPlane - this.camera.position.z) / dir.z;
    const posz = this.camera.position.clone().add(dir.multiplyScalar(distancez));

    posz.x = posz.x | 0;
    posz.y = posz.y | 0;

    const distancex = (xPlane - this.camera.position.x) / dir.x;
    const posx = this.camera.position.clone().add(dir.multiplyScalar(distancex));

    posx.x = posx.x | 0;
    posx.y = posx.y | 0;

    if (distancex > distancez) {
      //dot(posx);
      return posx;
    } else {
      //dot(posz);
      return posz;
    }
  }

  dot(pos: THREE.Vector3) {
    console.log(pos);

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
    this.scene.add(cube);
  }

  getOffset(mesh: THREE.Mesh, vertexIndex: number): number {
    const geo: any = mesh.geometry;

    if (!geo.attributes || !geo.attributes.offset) return null;

    return geo.attributes.offset.array[vertexIndex];
  }

  getSide(mesh: THREE.Mesh, vertexIndex: number) {
    const geo: any = mesh.geometry;

    return Math.floor(geo.attributes.data.array[vertexIndex] / 256.0);
  }

  setType(_type: number) {
    this.type = _type;

    if (this.type === 4) this.webcam.init();
  }
}
