var DesktopViewPoint = require('./DesktopViewPoint');

function DesktopPlatform() {
  function getRenderer(container) {
    var renderer = new THREE.WebGLRenderer();

    renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    return renderer;
  }

  return {
    ViewPoint: DesktopViewPoint,
    getRenderer: getRenderer
  };
}

module.exports = DesktopPlatform;
