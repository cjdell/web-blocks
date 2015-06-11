var THREE = require('three');

function CardboardViewPoint(camera, light, viewPort, renderer, worldInfo) {
  var controls = null;

  //camera.position.y = 12;
  //camera.position.z = 30;

  camera.position.x = 100;
  camera.position.y = 16;
  camera.position.z = 100;

  //controls = new THREE.OrbitControls(camera, container);
  //
  //controls.rotateUp(Math.PI / 4);
  //controls.target.set(camera.position.x + 0.1, camera.position.y, camera.position.z);
  //controls.noZoom = true;
  //controls.noPan = true;
  //controls.autoRotate = true;

  setInterval(function() {
    //camera.position.x += 0.01;

    //console.log(controls.getTheta);

    //console.log(controls.alpha, controls.beta, controls.gamma);

    var theta = controls.alpha + (Math.PI * 0.5);
    var phi = 0;

    var movement = { x: 0, y: 0, z: -0.1 };

    camera.position.x -= (movement.z * -0.5) * Math.cos(theta) - (movement.x * 0.5) * Math.sin(theta);
    camera.position.z += (movement.z * -0.5) * Math.sin(theta) + (movement.x * 0.5) * Math.cos(theta);

    //camera.position.y += (movement.z * -0.5) * Math.cos(phi);

  }, 10);

  function setOrientationControls(e) {
    controls = new THREE.DeviceOrientationControls(camera, true);
    controls.connect();
    controls.update();

    viewPort.addEventListener('click', fullscreen, false);
  }

  setOrientationControls();

  function fullscreen() {
    if (viewPort.requestFullscreen) {
      viewPort.requestFullscreen();
    } else if (viewPort.msRequestFullscreen) {
      viewPort.msRequestFullscreen();
    } else if (viewPort.mozRequestFullScreen) {
      viewPort.mozRequestFullScreen();
    } else if (viewPort.webkitRequestFullscreen) {
      viewPort.webkitRequestFullscreen();
    }
  }

  window.addEventListener('resize', _.debounce(onWindowResize, 500), false);

  function onWindowResize() {
    var width = window.innerWidth, height = window.innerHeight;

    console.log('onWindowResize', width, height);

    if (renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  function tick() {
    controls.update();

    restrain(camera);
  }

  function restrain(camera) {
    camera.position.x = Math.max(camera.position.x, 0);
    //camera.position.y = Math.max(camera.position.y, 0);
    camera.position.z = Math.max(camera.position.z, 0);

    camera.position.x = Math.min(camera.position.x, worldInfo.blockDimensions.x);
    //camera.position.y = Math.min(camera.position.y, blockDimensions.y);
    camera.position.z = Math.min(camera.position.z, worldInfo.blockDimensions.z);

    camera.position.y = 12;
  }

  return {
    tick: tick
  };
}

module.exports = CardboardViewPoint;
