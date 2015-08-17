var THREE = require('three');

require('../lib/StereoEffect');
require('../lib/DeviceOrientationControls');
require('../lib/OrbitControls');

var CardboardViewPoint = require('./CardboardViewPoint');

function CardboardPlatform() {
  var renderer = null;
  var effect = null;
  var viewPort = null;

  function init(container) {
    renderer = new THREE.WebGLRenderer();
    viewPort = container;

    var width = window.innerWidth, height = window.innerHeight;

    renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    effect = new THREE.StereoEffect(renderer);
    effect.setSize(width, height);
  }

  function getUserInterface() {
    return null;
  }

  function getRenderer() {
    return renderer;
  }

  function getEffect() {
    return effect;
  }

  function getViewPort() {
    return viewPort;
  }

  return {
    ViewPoint: CardboardViewPoint,
    init: init,
    getUserInterface: getUserInterface,
    getRenderer: getRenderer,
    getEffect: getEffect,
    getViewPort: getViewPort
  };
}

module.exports = CardboardPlatform;
