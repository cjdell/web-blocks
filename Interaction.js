var CuboidTool = require('./tools/CuboidTool');

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
        type: type,
        workerInterface: workerInterface,
        getPositionOfMouseAlongXZPlane: getPositionOfMouseAlongXZPlane,
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

  function getPositionOfMouseAlongXZPlane(xPlane, zPlane) {
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

  function dot(pos) {
    console.log(pos);

    var geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
    scene.add(cube);
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

module.exports = Interaction;
