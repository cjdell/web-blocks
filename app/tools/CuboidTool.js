function CuboidTool(context) {
  var state = 'select-start';
  var startPos = null, endPos = null, heightPos = null, initialMouseHeight = null, relMouseHeight = null;
  var cube = null;

  function onBlockClick(pos) {

  }

  function onMouseClick(mouse, pos) {
    if (state === 'select-start') {
      startPos = pos;

      cube = addCube(pos);

      state = 'select-end';

    } else if (state === 'select-end') {
      //pos.y += 1;

      endPos = pos.clone();
      endPos.y = startPos.y;

      heightPos = pos.clone();

      var size = endPos.clone().sub(startPos);

      scaleCube(cube, startPos, size);

      state = 'select-height';

      var currentMouseHeight = context.getPositionOfMouseAlongXZPlane(endPos.x, endPos.z).y;

      initialMouseHeight = currentMouseHeight;

      relMouseHeight = 0;

    } else if (state === 'select-height') {
      heightPos.y = endPos.y + relMouseHeight;

      context.workerInterface.setBlocks(startPos, heightPos, context.type, true);

      removeCube(cube);

      context.finished();
    }
  }

  function onMouseMove(mouse, pos) {
    var size;

    if (state === 'select-end') {
      endPos = pos.clone();
      endPos.y = startPos.y;

      size = endPos.clone().sub(startPos);

      scaleCube(cube, startPos, size);

    } else if (state === 'select-height') {
      var currentMouseHeight = context.getPositionOfMouseAlongXZPlane(endPos.x, endPos.z).y;

      relMouseHeight = currentMouseHeight - initialMouseHeight;

      heightPos.y = endPos.y + relMouseHeight;

      size = heightPos.clone().sub(startPos);

      scaleCube(cube, startPos, size);
    }
  }

  function cancel() {
    removeCube(cube);
  }

  function addCube(pos) {
    var geometry = new THREE.CubeGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    var cube = new THREE.Mesh(geometry, material);

    cube.position.x = pos.x + 0.5;
    cube.position.y = pos.y + 0.55;
    cube.position.z = pos.z + 0.5;

    cube.rotation.x = Math.PI / 2;

    //cube.rotation.x = Math.PI / 2;

    cube.name = 'selection-cube';

    context.scene.add(cube);

    return cube;
  }

  function scaleCube(cube, pos, size) {
    size = size.clone();

    //console.log('size', size);

    size.x += size.x >= 0 ? 1 : -1;
    size.y += size.y >= 0 ? 1 : -1;
    size.z += size.z >= 0 ? 1 : -1;

    cube.position.x = pos.x + size.x / 2;
    cube.position.y = pos.y + size.y / 2;
    cube.position.z = pos.z + size.z / 2;

    cube.scale.x = size.x;
    cube.scale.z = size.y;
    cube.scale.y = size.z;
  }

  function removeCube(cube) {
    context.scene.remove(cube);
  }

  return {
    onBlockClick: onBlockClick,
    onMouseClick: onMouseClick,
    onMouseMove: onMouseMove,
    cancel: cancel
  };
}

module.exports = CuboidTool;
