/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import tb from './ToolBase';

module CuboidTool {
  export function NewCuboidTool(context:tb.Context):tb.Tool {
    var state = 'select-start';
    var startPos:THREE.Vector3 = null, endPos:THREE.Vector3 = null, heightPos:THREE.Vector3 = null, initialMouseHeight:number = null, relMouseHeight:number = null;
    var cube:THREE.Mesh = null;

    function onBlockClick(pos:THREE.Vector3):void {

    }

    function onMouseClick(mouse:THREE.Vector2, pos:THREE.Vector3):void {
      if (state === 'select-start') {
        startPos = pos;

        cube = addCube(pos);

        state = 'select-end';

      } else if (state === 'select-end') {
        //pos.y += 1;

        endPos = pos.clone();
        endPos.y = startPos.y;

        heightPos = pos.clone();

        scaleCube(cube, startPos, endPos);

        state = 'select-height';

        var currentMouseHeight = context.getPositionOfMouseAlongXZPlane(endPos.x, endPos.z).y;

        initialMouseHeight = currentMouseHeight;

        relMouseHeight = 0;

      } else if (state === 'select-height') {
        heightPos.y = endPos.y + relMouseHeight;

        context.workerInterface.setBlocks(startPos, heightPos, context.type, 0, true);

        removeCube(cube);

        context.finished();
      }
    }

    function onMouseMove(mouse:THREE.Vector2, pos:THREE.Vector3):void {
      if (state === 'select-end') {
        endPos = pos.clone();
        endPos.y = startPos.y;

        scaleCube(cube, startPos, endPos);

      } else if (state === 'select-height') {
        var currentMouseHeight = context.getPositionOfMouseAlongXZPlane(endPos.x, endPos.z).y;

        relMouseHeight = currentMouseHeight - initialMouseHeight;

        heightPos.y = endPos.y + relMouseHeight;

        scaleCube(cube, startPos, heightPos);
      }
    }

    function cancel():void {
      removeCube(cube);
    }

    function addCube(pos:THREE.Vector3) {
      var geometry = new THREE.BoxGeometry(1, 1, 1);
      var material = new THREE.MeshLambertMaterial({ color: 0xffff00, side: THREE.DoubleSide });
      var cube = new THREE.Mesh(geometry, material);

      cube.position.x = pos.x + 0.5;
      cube.position.y = pos.y + 0.5;
      cube.position.z = pos.z + 0.5;

      cube.rotation.x = Math.PI / 2;

      //cube.rotation.x = Math.PI / 2;

      cube.name = 'selection-cube';

      context.scene.add(cube);

      return cube;
    }

    function scaleCube(cube:THREE.Mesh, fromPos:THREE.Vector3, toPos:THREE.Vector3) {
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

      var size = toPos.clone().sub(fromPos);

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

    function removeCube(cube:THREE.Mesh) {
      context.scene.remove(cube);
    }

    return {
      onBlockClick: onBlockClick,
      onMouseClick: onMouseClick,
      onMouseMove: onMouseMove,
      cancel: cancel
    };
  }
}

export default CuboidTool;
