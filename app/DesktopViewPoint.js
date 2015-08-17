var _ = require('underscore');
var THREE = require('three');

function DesktopViewPoint(camera, light, viewPort, renderer, worldInfo) {
  var speed = 10;
  var lookMode = false;

  camera.position.x = 100;
  camera.position.y = 16;
  camera.position.z = 120;

  var movement = { x: 0, y: 0, z: 0 };
  var turn = { x: 0, y: 0 };

  var mouse = new THREE.Vector2();

  window.addEventListener('resize', _.debounce(onWindowResize, 500), false);

  function onWindowResize() {
    var width = viewPort.clientWidth, height = viewPort.clientHeight;

    console.log('onWindowResize', width, height);

    if (renderer) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    }
  }

  function keyDown(event) {
    if (window.blockMovement) return;

    if (event.keyCode === 65) movement.x = -1;      // A (Left)
    if (event.keyCode === 68) movement.x = 1;       // D (Right)

    //if (event.keyCode === 38) movement.y = 1;       // Up Arrow (Elevate)
    //if (event.keyCode === 40) movement.y = -1;      // Down Arrow (Decline)

    if (event.keyCode === 87) movement.z = -1;      // W (Forwards)
    if (event.keyCode === 83) movement.z = 1;       // S (Backwards)

    if (event.keyCode === 38) turn.y = 1;       // Up Arrow (Turn Up)
    if (event.keyCode === 40) turn.y = -1;      // Down Arrow (Turn Down)

    if (event.keyCode === 37) turn.x = -1;      // Left Arrow (Turn Left)
    if (event.keyCode === 39) turn.x = 1;       // Right Arrow (Turn Right)
  }

  function keyUp(event) {
    if (event.keyCode === 65) movement.x = 0;       // A (Left)
    if (event.keyCode === 68) movement.x = 0;       // D (Right)

    //if (event.keyCode === 38) movement.y = 0;       // Up Arrow (Elevate)
    //if (event.keyCode === 40) movement.y = 0;       // Down Arrow (Decline)

    if (event.keyCode === 87) movement.z = 0;       // W (Forwards)
    if (event.keyCode === 83) movement.z = 0;       // S (Backwards)

    if (event.keyCode === 38) turn.y = 0;       // Up Arrow (Turn Up)
    if (event.keyCode === 40) turn.y = 0;       // Down Arrow (Turn Down)

    if (event.keyCode === 37) turn.x = 0;       // Left Arrow (Turn Left)
    if (event.keyCode === 39) turn.x = 0;       // Right Arrow (Turn Right)
  }

  //var down = false, mouseDownX = 0, mouseDownY = 0, mouseX = 0, mouseY = 0;
  //
  //function mouseDown(event) {
  //  down = true;
  //  mouseDownX = event.clientX;
  //  mouseDownY = event.clientY;
  //  mouseX = 0;
  //  mouseY = 0;
  //}
  //
  //function mouseMove(event) {
  //  mouseX = event.clientX - mouseDownX;
  //  mouseY = event.clientY - mouseDownY;
  //
  //  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  //  mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
  //}
  //
  //function mouseUp(event) {
  //  down = false;
  //
  //  //lookMode = !lookMode;
  //}

  document.addEventListener('keydown', keyDown, false);
  document.addEventListener('keyup', keyUp, false);

  //document.addEventListener('mousedown', mouseDown, false);
  //document.addEventListener('mousemove', mouseMove, false);
  //document.addEventListener('mouseup', mouseUp, false);

  var lon = 270, lat = -20;

  var zDelta = 0;

  var lastFrame = Date.now();

  function tick() {
    //if (!movement.x && !movement.y && !movement.z && !turn.x && !turn.y) return;

    //camera.position.x += speed * (movement.x / 60);
    //camera.position.y += speed * (movement.y / 60);
    //camera.position.z += speed * (movement.z / 60);

    var now = Date.now();

    var correction = (now - lastFrame) / (1000 / 60);

    lastFrame = now;

    //console.log(correction);

    if (lookMode) {
      lon += mouseX * 0.005;
      lat -= mouseY * 0.005;
    }

    zDelta += movement.z * 0.01;         // Creep speed up as user presses W

    if (movement.z === 0) zDelta = 0;   // Full stop

    lon += turn.x * correction * 2;
    lat += turn.y * correction * 2;

    lat = Math.max(-89.9, Math.min(89.9, lat));

    var phi = ( 90 - lat ) * Math.PI / 180;
    var theta = (lon * Math.PI / 180);

    //console.log(phi, theta);

    camera.position.x += correction * ((zDelta * -0.5) * Math.cos(theta) - (movement.x * 0.5) * Math.sin(theta));
    camera.position.z += correction * ((zDelta * -0.5) * Math.sin(theta) + (movement.x * 0.5) * Math.cos(theta));

    camera.position.y += correction * ((zDelta * -0.5) * Math.cos(phi));

    var xx = 100 * Math.sin(phi) * Math.cos(theta) + camera.position.x;
    var yy = 100 * Math.cos(phi) + camera.position.y;
    var zz = 100 * Math.sin(phi) * Math.sin(theta) + camera.position.z;

    var target = new THREE.Vector3(xx, yy, zz);

    camera.lookAt(target);

    // Move the light

    light.position.set(camera.position.x, camera.position.y, camera.position.z);

    restrain(camera);
  }

  function restrain(camera) {
    camera.position.x = Math.max(camera.position.x, 0);
    camera.position.y = Math.max(camera.position.y, 0);
    camera.position.z = Math.max(camera.position.z, 0);

    camera.position.x = Math.min(camera.position.x, worldInfo.worldDimensionsInBlocks.x);
    camera.position.y = Math.min(camera.position.y, worldInfo.worldDimensionsInBlocks.y);
    camera.position.z = Math.min(camera.position.z, worldInfo.worldDimensionsInBlocks.z);
  }

  function getPosition() {
    return camera.position;
  }

  function setPosition(pos) {
    camera.position.set(pos.x, pos.y, pos.z);
  }

  function getTarget() {
    return { lon: lon, lat: lat };
  }

  function setTarget(target) {
    lon = target.lon;
    lat = target.lat;
  }

  return {
    tick: tick,
    getPosition: getPosition,
    setPosition: setPosition,
    getTarget: getTarget,
    setTarget: setTarget
  };
}

module.exports = DesktopViewPoint;
