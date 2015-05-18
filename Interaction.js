function Interaction(viewPort, scene, camera, workerInterface, worldInfo) {
  var mouse = new THREE.Vector2(), down = false;
  var raycaster = new THREE.Raycaster();

  var type = 1;
  var tool = null;

  var isDesktop = true; // TODO: Detect mobile

  if (isDesktop) {
    viewPort.addEventListener('mousedown', mouseDown, false);
    viewPort.addEventListener('mousemove', mouseMove, false);
    viewPort.addEventListener('mouseup', mouseUp, false);
  }

  function mouseDown(event) {
    down = true;
  }

  function mouseMove(event) {
    mouse.x = ( event.clientX / viewPort.clientWidth ) * 2 - 1;
    mouse.y = -( event.clientY / viewPort.clientHeight ) * 2 + 1;

    var pos = getBlockPositionOfMouse();

    if (tool) tool.onMouseMove(mouse, pos);
  }

  function mouseUp(event) {
    down = false;

    var pos = getBlockPositionOfMouse();

    if (!tool) {
      var context = {
        scene: scene,
        workerInterface: workerInterface,
        getPositionOfMouseAlongZPlane: getPositionOfMouseAlongZPlane,
        finished: finished
      };

      tool = new CuboidTool(context);
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
      var hitBlock = null;

      var i = 0;

      // Don't detect the selection cube
      while (intersects[i].object.name === 'selection-cube') {
        i++;

        if (i >= intersects.length) return;
      }

      hitBlock = intersects[i];

      var vertexIndex = hitBlock.face.a;

      var offset = getOffset(hitBlock.object, vertexIndex);

      if (!offset) return null;

      var side = getSide(hitBlock.object, vertexIndex);

      return getPositionFromIndex(offset);
    }

    return null;
  }

  function getPositionOfMouseAlongZPlane(zPlane) {
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    var dir = vector.sub(camera.position).normalize();
    var distance = (zPlane - camera.position.z) / dir.z;
    var pos = camera.position.clone().add(dir.multiplyScalar(distance));
    pos.x = pos.x | 0;
    pos.y = pos.y | 0;
    return pos;
  }

  // TODO: Commonise
  function getPositionFromIndex(index) {
    var z = Math.floor(index / (worldInfo.blockDimensions.x * worldInfo.blockDimensions.y));
    var y = Math.floor((index - z * worldInfo.blockDimensions.x * worldInfo.blockDimensions.y) / worldInfo.blockDimensions.x);
    var x = index - worldInfo.blockDimensions.x * (y + worldInfo.blockDimensions.y * z);

    return new THREE.Vector3(x, y, z);
  }

  function getOffset(mesh, vertexIndex) {
    if (!mesh.geometry.attributes || !mesh.geometry.attributes.offset) return null;

    return mesh.geometry.attributes.offset.array[vertexIndex];
  }

  function getSide(mesh, vertexIndex) {
    return Math.floor(mesh.geometry.attributes.data.array[vertexIndex] / 256.0);
  }

  function setType(_type) {
    type = _type;
  }

  return {
    setType: setType
  };
}

function CuboidTool(context) {
  var state = 'select-start';
  var startPos = null, endPos = null, heightPos = null;
  var cube = null;

  function onBlockClick(pos) {

  }

  function onMouseClick(mouse, pos) {
    if (state === 'select-start') {
      pos.y += 1;

      startPos = pos;

      cube = addCube(pos);

      state = 'select-end';
    } else if (state === 'select-end') {
      pos.y += 1;

      endPos = pos;
      endPos.y = pos.y;

      var size = endPos.clone().sub(startPos);

      size.x += 1;
      size.y += 1;
      size.z += 1;

      scaleCube(cube, startPos, size);

      state = 'select-height';
      heightPos = context.getPositionOfMouseAlongZPlane(endPos.z);
    } else if (state === 'select-height') {

      endPos.y = heightPos.y;

      context.workerInterface.setBlocks(startPos, endPos, 1, true);

      removeCube(cube);

      context.finished();
    }
  }

  function onMouseMove(mouse, pos) {
    var size;

    if (state === 'select-end') {
      pos.y += 1;

      endPos = pos;
      endPos.y = pos.y;

      size = endPos.clone().sub(startPos);

      size.x += 1;
      size.y += 1;
      size.z += 1;

      scaleCube(cube, startPos, size);
    } else if (state === 'select-height') {
      heightPos = context.getPositionOfMouseAlongZPlane(endPos.z);

      endPos.y = heightPos.y;

      size = endPos.clone().sub(startPos);

      size.x += 1;
      size.y += 1;
      size.z += 1;

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
    cube.position.y = pos.y + 0.5;
    cube.position.z = pos.z + 0.5;

    cube.rotation.x = Math.PI / 2;

    cube.rotation.x = Math.PI / 2;

    cube.name = 'selection-cube';

    context.scene.add(cube);

    return cube;
  }

  function scaleCube(cube, pos, size) {
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

module.exports = Interaction;
