var CardboardViewPoint = require('./CardboardViewPoint');

function CardboardPlatform() {
  var renderer = null;

  function getRenderer(container) {
    renderer = new THREE.WebGLRenderer();

    var width = window.innerWidth, height = window.innerHeight;

    renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    var effect = new THREE.StereoEffect(renderer);

    effect.setSize(width, height);

    return effect;
  }

  return {
    ViewPoint: CardboardViewPoint,
    getRenderer: getRenderer
  };
}

module.exports = CardboardPlatform;
