var DesktopViewPoint = require('./DesktopViewPoint');
var UserInterface = require('./ui/index.jsx');

function DesktopPlatform() {
  var renderer = null;
  var ui = null;
  var viewPort = null;

  function init(container) {
    ui = new UserInterface();

    ui.init(container);

    viewPort = ui.getViewPort();

    renderer = new THREE.WebGLRenderer();

    setTimeout(function() {
      renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
      renderer.setSize(viewPort.clientWidth, viewPort.clientHeight);

      viewPort.appendChild(renderer.domElement);
    }, 1000);
  }

  function getUserInterface() {
    return ui;
  }

  function getRenderer() {
    return renderer;
  }

  function getViewPort() {
    return viewPort;
  }

  return {
    ViewPoint: DesktopViewPoint,
    init: init,
    getUserInterface: getUserInterface,
    getRenderer: getRenderer,
    getViewPort: getViewPort
  };
}

module.exports = DesktopPlatform;
