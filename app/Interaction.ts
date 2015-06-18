/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import wi from './WorkerInterface';
import tb from './tools/ToolBase';
import ct from './tools/CuboidTool';
import com from '../common/Common';

module Interaction {
  export interface Interaction {
    setType(type: number): void;
  }

  export function NewInteraction(viewPort: HTMLElement, scene: THREE.Scene, camera: THREE.Camera, workerInterface: wi.WorkerInterface, worldInfo: any, webcam: any): Interaction {
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    let down = false;
    let type = 1;
    let tool: tb.Tool = null;

    let isDesktop = true; // TODO: Detect mobile

    if (isDesktop) {
      viewPort.addEventListener('mousedown', mouseDown, false);
      viewPort.addEventListener('mousemove', mouseMove, false);
      viewPort.addEventListener('mouseup', mouseUp, false);

      document.addEventListener('keypress', keyPress, false);
    }

    function keyPress(event: KeyboardEvent) {
      // console.log('keyPress', event.keyCode, event.ctrlKey);
      if (event.keyCode == 26 && event.ctrlKey) {
        // console.log('undo');
        workerInterface.undo();
      }
    }

    function mouseDown(event: any) {
      down = true;
    }

    function mouseMove(event: any) {
      mouse.x = (event.clientX / viewPort.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / viewPort.clientHeight) * 2 + 1;

      let pos = getBlockPositionOfMouse();

      if (tool) tool.onMouseMove(mouse, pos);
    }

    function mouseUp(event: any) {
      down = false;

      const pos = getBlockPositionOfMouse();

      if (!tool) {
        const context: tb.Context = {
          scene: scene,
          type: type,
          workerInterface: workerInterface,
          getPositionOfMouseAlongXZPlane: getPositionOfMouseAlongXZPlane,
          finished: finished
        };

        tool = ct.NewCuboidTool(context);
      }

      if (tool) tool.onMouseClick(mouse, pos);
    }

    function finished() {
      tool = null;
    }

    function getBlockPositionOfMouse() {
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children);

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

        const offset = getOffset(<THREE.Mesh>hitBlock.object, vertexIndex);

        if (!offset) return null;

        const side = getSide(<THREE.Mesh>hitBlock.object, vertexIndex);

        return com.getWorldPositionFromIndex(worldInfo, offset);
      }

      return null;
    }

    function getPositionOfMouseAlongXZPlane(xPlane: number, zPlane: number) {
      const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
      vector.unproject(camera);

      //dot(vector);

      const dir = vector.sub(camera.position).normalize();

      const distancez = (zPlane - camera.position.z) / dir.z;
      const posz = camera.position.clone().add(dir.multiplyScalar(distancez));

      posz.x = posz.x | 0;
      posz.y = posz.y | 0;

      const distancex = (xPlane - camera.position.x) / dir.x;
      const posx = camera.position.clone().add(dir.multiplyScalar(distancex));

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

    function dot(pos: THREE.Vector3) {
      console.log(pos);

      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(pos.x, pos.y, pos.z);
      scene.add(cube);
    }

    function getOffset(mesh: THREE.Mesh, vertexIndex: number): number {
      const geo: any = mesh.geometry;

      if (!geo.attributes || !geo.attributes.offset) return null;

      return geo.attributes.offset.array[vertexIndex];
    }

    function getSide(mesh: THREE.Mesh, vertexIndex: number) {
      const geo: any = mesh.geometry;

      return Math.floor(geo.attributes.data.array[vertexIndex] / 256.0);
    }

    function setType(_type: number) {
      type = _type;

      if (type === 4) webcam.init();
    }

    return {
      setType: setType
    };
  }
}

export default Interaction;
