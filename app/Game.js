var Culling = require('./Culling');
var BlockTypeList = require('./BlockTypeList');
var Interaction = require('./Interaction');
var WorldViewer = require('./WorldViewer');
var WorkerInterface = require('./WorkerInterface');
var Api = require('./Api');
var Webcam = require('./Webcam');

function Game() {
  var workerInterface = null;
  var renderer = null;
  var viewPort = null;
  var camera = null;
  var scene = null;
  var blockTypeList = null;
  var worldViewer = null;
  var viewPoint = null;
  var culling = null;
  var interaction = null;
  var api = null;
  var webcam = null;

  var uniforms = null;
  var frame = 0;
  var log = false;

  var vertexShader = null;
  var fragmentShader = null;

  function init(platform) {
    workerInterface = new WorkerInterface();

    renderer = platform.getRenderer();
    viewPort = platform.getViewPort();

    if (renderer.setClearColor) renderer.setClearColor(0xffffff, 1);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

    scene = new THREE.Scene();

    scene.fog = new THREE.FogExp2(0xffffff, 0.0025);

    blockTypeList = new BlockTypeList();

    return Promise.all([workerInterface.init(), loadShaders()])
    .then(function(res) {
      var worldInfo = res[0];

      uniforms = {};

      uniforms.textures = { type: 't', value: null };
      uniforms.webcam = { type: 't', value: null };
      uniforms.color = { type: 'f', value: 1.0 };
      uniforms.time = { type: 'f', value: 0.0 };

      uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['lights'], uniforms]);
      uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['fog'], uniforms]);

      var attributes = {
        data: { type: 'v3', value: null },
        offset: { type: 'f', value: null }
      };

      var blockMaterial = new THREE.ShaderMaterial({
        attributes: attributes,
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        vertexColors: THREE.VertexColors,
        transparent: false,
        lights: true,
        fog: true
      });

      //var blockMaterial = new THREE.MeshLambertMaterial({ color: 0xbbccff });

      blockTypeList.getBlockTexture().then(function(texture) {
        blockMaterial.uniforms.textures.value = texture;
      });

      worldViewer = new WorldViewer(scene, worldInfo, blockMaterial, workerInterface);

      var ambientLight = new THREE.AmbientLight(0x777777);
      scene.add(ambientLight);

      // Create light
      var pointLight = new THREE.PointLight(0xffffff, 1.0);
      pointLight.position.set(5.0, 5.0, 5.0);
      scene.add(pointLight);

      viewPoint = new platform.ViewPoint(camera, pointLight, viewPort, renderer, worldInfo);

      culling = new Culling(camera, worldInfo);

      webcam = new Webcam(scene);

      interaction = new Interaction(viewPort, scene, camera, workerInterface, worldInfo, webcam);

      // Expose API as global for console access
      api = self.api = new Api(workerInterface, viewPoint);



      //webcam.init();

      blockMaterial.uniforms.webcam.value = webcam.getTexture();

      render(); // Kick off the render loop
    });
  }

  function render() {
    requestAnimationFrame(render);

    webcam.render();

    uniforms.time.value += 0.1;

    viewPoint.tick();

    frame += 1;

    if (frame % 10 === 0) {
      var changes = culling.getNewlyVisiblePartitions();

      worldViewer.exposeNewPartitions(changes);
    }

    renderer.render(scene, camera);

    if (log) console.timeEnd('frame');
  }

  function getBlockTypes() {
    return blockTypeList.getBlockTypes();
  }

  function setBlockType(blockTypeIndex) {
    return interaction.setType(blockTypeIndex);
  }

  function loadShaders() {
    return Promise.all([
      self.fetch('shaders/block.vertex.glsl'),
      self.fetch('shaders/block.fragment.glsl')
    ])
    .then(function(res) {
      return Promise.all([res[0].text(), res[1].text()]);
    })
    .then(function(data) {
      vertexShader = data[0];
      fragmentShader = data[1];
    });
  }

  function getApi() {

  }

  return {
    init: init,
    getBlockTypes: getBlockTypes,
    setBlockType: setBlockType,
    getApi: getApi
  };
}

module.exports = Game;
