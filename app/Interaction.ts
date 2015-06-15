/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import wi from './WorkerInterface';
import tb from './tools/ToolBase';
import ct from './tools/CuboidTool';

module Interaction {
  export interface Interaction {
    setType(type:number):void;
  }

  export function NewInteraction(viewPort:HTMLElement, scene:THREE.Scene, camera:THREE.Camera, workerInterface:wi.WorkerInterface, worldInfo:any, webcam:any):Interaction {
    var mouse = new THREE.Vector2(), down = false;
    var raycaster = new THREE.Raycaster();

    var type = 1;
    var tool: tb.Tool = null;

    var isDesktop = true; // TODO: Detect mobile

    if (isDesktop) {
      viewPort.addEventListener('mousedown', mouseDown, false);
      viewPort.addEventListener('mousemove', mouseMove, false);
      viewPort.addEventListener('mouseup', mouseUp, false);
    }

    function mouseDown(event:any) {
      down = true;
    }

    function mouseMove(event:any) {
      mouse.x = ( event.clientX / viewPort.clientWidth ) * 2 - 1;
      mouse.y = -( event.clientY / viewPort.clientHeight ) * 2 + 1;

      var pos = getBlockPositionOfMouse();

      if (tool) tool.onMouseMove(mouse, pos);
    }

    function mouseUp(event:any) {
      down = false;

      var pos = getBlockPositionOfMouse();

      if (!tool) {
        var context: tb.Context = {
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

      var intersects = raycaster.intersectObjects(scene.children);

      if (intersects.length > 0) {
        var hitBlock:THREE.Intersection = null;

        var i = 0;

        // Don't detect the selection cube
        while (intersects[i].object.name === 'selection-cube') {
          i++;

          if (i >= intersects.length) return;
        }

        hitBlock = intersects[i];

        var vertexIndex = hitBlock.face.a;

        var offset = getOffset(<THREE.Mesh>hitBlock.object, vertexIndex);

        if (!offset) return null;

        var side = getSide(<THREE.Mesh>hitBlock.object, vertexIndex);

        return getPositionFromIndex(offset);
      }

      return null;
    }

    function getPositionOfMouseAlongXZPlane(xPlane:number, zPlane:number) {
      var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
      vector.unproject(camera);

      //dot(vector);

      var dir = vector.sub(camera.position).normalize();

      var distancez = (zPlane - camera.position.z) / dir.z;
      var posz = camera.position.clone().add(dir.multiplyScalar(distancez));

      posz.x = posz.x | 0;
      posz.y = posz.y | 0;

      var distancex = (xPlane - camera.position.x) / dir.x;
      var posx = camera.position.clone().add(dir.multiplyScalar(distancex));

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

    function dot(pos:THREE.Vector3) {
      console.log(pos);

      var geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      var cube = new THREE.Mesh(geometry, material);
      cube.position.set(pos.x, pos.y, pos.z);
      scene.add(cube);
    }

    // TODO: Commonise
    function getPositionFromIndex(index:number) {
      var z = Math.floor(index / (worldInfo.blockDimensions.x * worldInfo.blockDimensions.y));
      var y = Math.floor((index - z * worldInfo.blockDimensions.x * worldInfo.blockDimensions.y) / worldInfo.blockDimensions.x);
      var x = index - worldInfo.blockDimensions.x * (y + worldInfo.blockDimensions.y * z);

      return new THREE.Vector3(x, y, z);
    }

    function getOffset(mesh:THREE.Mesh, vertexIndex:number) {
      var geo:any = mesh.geometry;

      if (!geo.attributes || !geo.attributes.offset) return null;

      return geo.attributes.offset.array[vertexIndex];
    }

    function getSide(mesh:THREE.Mesh, vertexIndex:number) {
      var geo:any = mesh.geometry;

      return Math.floor(geo.attributes.data.array[vertexIndex] / 256.0);
    }

    function setType(_type:number) {
      type = _type;

      if (type === 4) webcam.init();
    }

    return {
      setType: setType
    };
  }
}

export default Interaction;
