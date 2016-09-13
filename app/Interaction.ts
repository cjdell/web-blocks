"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../common/WorldInfo';
import constants from '../common/Constants';
import { BlockTypeIds } from '../common/BlockTypeList';
import WorkerInterface from './WorkerInterface';
import Webcam from './Webcam';
import { Context, Tool } from './tools/ToolBase';
import Tools from './tools/Tools';
import CuboidTool from "./tools/CuboidTool";

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
  selectedTool: string = 'block';
  tool: Tool = null;

  isDesktop = true; // TODO: Detect mobile

  static rightClick: Function = function () { };

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
      viewPort.addEventListener('contextmenu', (e) => this.mouseUp(e), false);

      document.addEventListener('keypress', (e) => this.keyPress(e), false);
    }
  }

  getAvailableTools() {
    return Tools.map(tool => ({
      type: tool.type,
      name: tool.name,
      icon: tool.icon
    }));
  }

  setType(_type: number) {
    this.type = _type;

    if (this.type === BlockTypeIds.Webcam) this.webcam.init();
  }

  setToolType(toolType: string) {
    this.selectedTool = toolType;
  }

  private keyPress(event: KeyboardEvent) {
    if (event.keyCode === 26 && event.ctrlKey) {
      this.workerInterface.undo();

    } else if (!(<any>window).blockMovement && event.keyCode >= 48 && event.keyCode <= 57) {
      this.workerInterface.executeBoundScript(event.keyCode - 48);
    }
  }

  private mouseDown(event: any) {
    if (event.type === 'contextmenu' || event.button === 2) {
      event.preventDefault();
      return;
    }

    this.down = true;
  }

  private mouseMove(event: any) {
    this.mouse.x = (event.clientX / this.viewPort.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.viewPort.clientHeight) * 2 + 1;

    const pos = this.getBlockPositionOfMouse();

    if (pos) this.workerInterface.setMousePosition(pos);

    if (this.tool) {
      this.tool.onMouseMove(this.mouse, pos ? pos.pos : null, pos ? pos.side : null);
    }
  }

  private mouseUp(event: any) {
    this.down = false;

    const pos = this.getBlockPositionOfMouse();

    // If we right-click
    if (event.type === 'contextmenu' || event.button === 2) {
      event.preventDefault();
      this.workerInterface.rightClick();
      return;
    }

    if (!this.tool) {
      this.tool = this.getTool();
    }

    if (this.tool) {
      if (this.tool instanceof CuboidTool) {
        (<CuboidTool>this.tool).context.type = this.type;
      }

      this.tool.onMouseClick(this.mouse, pos ? pos.pos : null, pos ? pos.side : null);
    }
  }

  private getTool() {
    const context: Context = this.getContext();

    const tool = Tools.filter(tool => tool.type === this.selectedTool);

    if (tool.length === 0) {
      throw new Error(`Invalid tool type "${this.selectedTool}"`);
    }

    return new tool[0].class(context);
  }

  private getContext(): Context {
    return {
      scene: this.scene,
      type: this.type,
      workerInterface: this.workerInterface,
      getPositionOfMouseAlongXZPlane: (xPlane: number, zPlane: number) =>
        this.getPositionOfMouseAlongXZPlane(xPlane, zPlane),
      finished: this.finished.bind(this)
    };
  }

  private finished() {
    this.tool = null;
  }

  private getBlockPositionOfMouse(): { pos: com.IntVector3, side: number } {
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

      return { pos: this.worldInfo.wpos(offset), side };
    }

    return null;
  }

  private getPositionOfMouseAlongXZPlane(xPlane: number, zPlane: number) {
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

  // For debugging, this just adds a tiny cube so I can see where vectors are
  private dot(pos: THREE.Vector3) {
    console.log(pos);

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
    this.scene.add(cube);
  }

  private getOffset(mesh: THREE.Mesh, vertexIndex: number): number {
    const geo: any = mesh.geometry;

    if (!geo.attributes || !geo.attributes.offset) return null;

    return geo.attributes.offset.array[vertexIndex];
  }

  private getSide(mesh: THREE.Mesh, vertexIndex: number) {
    const geo: any = mesh.geometry;

    return Math.floor(geo.attributes.data.array[vertexIndex * 4 + constants.VERTEX_DATA_SIDE]);
  }
}
