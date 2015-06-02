var Culling = require('./Culling');
var BlockTypeList = require('./BlockTypeList');
var Interaction = require('./Interaction');
var WorldViewer = require('./WorldViewer');
var WorkerInterface = require('./WorkerInterface');

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
    //renderer.shadowMapEnabled = true;

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

    scene = new THREE.Scene();

    scene.fog = new THREE.FogExp2(0xffffff, 0.0025);

    blockTypeList = new BlockTypeList();

    return Promise.all([workerInterface.init(), loadShaders()])
    .then(function(res) {
      var worldInfo = res[0];

      uniforms = {};

      uniforms.grass = { type: 'tv', value: null };
      uniforms.info = { type: 't', value: null };
      uniforms.color = { type: 'f', value: 1.0 };
      uniforms.time = { type: 'f', value: 0.0 };

      uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['lights'], uniforms]);
      uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['fog'], uniforms]);

      var attributes = {
        data: { type: 'f', value: null },
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
        blockMaterial.uniforms.info.value = texture;
      });

      // Tower
      workerInterface.setBlocks(new THREE.Vector3(5, 0, 5), new THREE.Vector3(10, 6, 10), 2);
      workerInterface.setBlocks(new THREE.Vector3(5, 7, 5), new THREE.Vector3(10, 10, 10), 1);

      // Sky
      //workerInterface.setBlocks(new THREE.Vector3(0, 30, 0), new THREE.Vector3(255, 30, 255), 2);

      // Water
      //workerInterface.setBlocks(new THREE.Vector3(0, 1, 0), new THREE.Vector3(255, 1, 255), 3);

      // Pyramid
      for (var i = 0; i <= 20; i++) {
        workerInterface.setBlocks(new THREE.Vector3(30 + i, i, 30 + i), new THREE.Vector3(70 - i, i, 70 - i), (i % 3) + 1);
      }

      //var c = 0;
      //
      //setInterval(function() {
      //  for (var i = 0; i <= 20; i++) {
      //    workerInterface.setBlocks(new THREE.Vector3(30 + i, i, 30 + i), new THREE.Vector3(70 - i, i, 70 - i), ((i + c) % 3) + 1, true);
      //  }
      //  c++;
      //}, 2000);

      //var c = 0;
      //
      //setInterval(function() {
      //  workerInterface.setBlocks(new THREE.Vector3(10, 30, 10), new THREE.Vector3(20, 30, 20), (c % 3) + 1, true);
      //  c++;
      //}, 1000);

      //setInterval(function() {
      //  workerInterface.getBlock(new THREE.Vector3(10, 10, 10))
      //  .then(function(result) {
      //    console.log(result);
      //  });
      //}, 1000);

      for (var xx = 0; xx < 60; xx++) {
        for (var zz = 0; zz < 60; zz++) {
          var r = Math.sqrt(Math.pow(xx - 30, 2) + Math.pow(zz - 30, 2));
          if (r <= 30 && r > 27) {
            workerInterface.setBlocks(new THREE.Vector3(xx + 20, 0, zz + 20), new THREE.Vector3(xx + 20, 20, zz + 20), 1);
          }
          if (r <= 27 && r > 24) {
            //workerInterface.setBlocks(new THREE.Vector3(xx + 20, 0, zz + 20), new THREE.Vector3(xx + 20, 20, zz + 20), 2);
          }
          if (r <= 24 && r > 21) {
            workerInterface.setBlocks(new THREE.Vector3(xx + 20, 0, zz + 20), new THREE.Vector3(xx + 20, 20, zz + 20), 2);
          }
        }
      }

      worldViewer = new WorldViewer(scene, worldInfo, blockMaterial, workerInterface);

      var ambientLight = new THREE.AmbientLight(0x777777);
      scene.add(ambientLight);

      // Create light
      var pointLight = new THREE.PointLight(0xffffff, 1.0);
      pointLight.position.set(5.0, 5.0, 5.0);
      scene.add(pointLight);

      //var dirLight = new THREE.DirectionalLight(0xffff00, 1.5);
      //dirLight.position.set(50.0, 100.0, 50.0);
      //dirLight.castShadow = true;
      //dirLight.shadowDarkness = true;
      //dirLight.shadowCameraVisible = true;
      //dirLight.shadowCameraRight = 500;
      //dirLight.shadowCameraLeft = -500;
      //dirLight.shadowCameraTop = 500;
      //dirLight.shadowCameraBottom = -500;
      //dirLight.shadowMapWidth = 4096;
      //dirLight.shadowMapHeight = 4096;
      //scene.add(dirLight);

      viewPoint = new platform.ViewPoint(camera, pointLight, viewPort, renderer, worldInfo);

      culling = new Culling(camera, worldInfo);

      interaction = new Interaction(viewPort, scene, camera, workerInterface, worldInfo);

      render(); // Kick off the render loop
    });
  }

  function render() {
    requestAnimationFrame(render);

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

  return {
    init: init,
    getBlockTypes: getBlockTypes,
    setBlockType: setBlockType
  };
}

module.exports = Game;
