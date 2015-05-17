var Culling = require('./Culling');
var BlockTypeList = require('./BlockTypeList');
var Interaction = require('./Interaction');
var WorldViewer = require('./WorldViewer');
var WorkerInterface = require('./WorkerInterface');
var DesktopPlatform = require('./DesktopPlatform');
var CardboardPlatform = require('./CardboardPlatform');

function Game() {
  function init(div) {
    var geoWorker = new Worker('GeometryWorker.js');

    var workerInterface = new WorkerInterface(geoWorker);

    var platform;

    if (detectmob()) {
      platform = new CardboardPlatform();
    } else {
      platform = new DesktopPlatform();
    }

    var renderer = platform.getRenderer(div);

    renderer.setClearColor(0xffffff, 1);
    renderer.shadowMapEnabled = true;

    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

    var scene = new THREE.Scene();

    scene.fog = new THREE.FogExp2(0xffffff, 0.0025);

    var blockTypeList = new BlockTypeList();

    return workerInterface.init()
    .then(function(worldInfo) {
      var uniforms = {};

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
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
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

      var worldViewer = new WorldViewer(scene, worldInfo, blockMaterial, workerInterface);

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

      var frame = 0;
      var log = false;

      var viewPoint = new platform.ViewPoint(camera, pointLight, div, renderer, worldInfo);

      var culling = new Culling(camera, worldInfo);

      var interaction = new Interaction(div, scene, camera, workerInterface, worldInfo);

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

      render();
    });
  }

  return {
    init: init
  }
}

window.Game = Game;
