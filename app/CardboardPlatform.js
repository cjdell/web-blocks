var THREE = require('three');

require('../lib/StereoEffect');
require('../lib/DeviceOrientationControls');
require('../lib/OrbitControls');

var CardboardViewPoint = require('./CardboardViewPoint');

function CardboardPlatform() {
  var renderer = null;
  var viewPort = null;

  function init(container) {
    var webGlRenderer = new THREE.WebGLRenderer();

    var width = window.innerWidth, height = window.innerHeight;

    webGlRenderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
    webGlRenderer.setSize(width, height);

    container.appendChild(webGlRenderer.domElement);

    var effect = new THREE.StereoEffect(webGlRenderer);

    effect.setSize(width, height);

    renderer = effect;
    viewPort = container;

    return effect;
  }

  function getRenderer() {
    return renderer;
  }

  function getViewPort() {
    return viewPort;
  }

  return {
    ViewPoint: CardboardViewPoint,
    init: init,
    getRenderer: getRenderer,
    getViewPort: getViewPort
  };
}

module.exports = CardboardPlatform;
