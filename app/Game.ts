import THREE = require('three');

import cu from './Culling';
import btl from './BlockTypeList';
import int from './Interaction';
import wv from './WorldViewer';
import wi from './WorkerInterface';
import _api from './Api';
import wc from './Webcam';
import tr from './TextRenderer';

module Game {
  export interface Game {
    init(platform: any): Promise<void>;
  }

  export function NewGame() {
    var workerInterface: wi.WorkerInterface = null;
    var renderer: any = null;
    var viewPort: any = null;
    var camera: THREE.Camera = null;
    var scene: THREE.Scene = null;
    var blockTypeList: btl.BlockTypeList = null;
    var worldViewer: wv.WorldViewer = null;
    var viewPoint: any = null;
    var culling: any = null;
    var interaction: int.Interaction = null;
    var api: _api.Api = null;
    var webcam: wc.Webcam = null;
    var textRenderer: tr.TextRenderer = null;

    var win = <any>self;

    var uniforms: any = null;
    var frame = 0;
    var log = false;

    var vertexShader: string = null;
    var fragmentShader: string = null;

    function init(platform: any): Promise<void> {
      workerInterface = wi.NewWorkerInterface();

      renderer = platform.getRenderer();
      viewPort = platform.getViewPort();

      if (renderer.setClearColor) renderer.setClearColor(0xffffff, 1);

      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

      scene = new THREE.Scene();

      scene.fog = new THREE.FogExp2(0xffffff, 0.0025);

      blockTypeList = btl.NewBlockTypeList();

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

        var attributes: any = {
          data: { type: 'v4', value: null },
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

        var ambientLight = new THREE.AmbientLight(0x777777);
        scene.add(ambientLight);

        // Create light
        var pointLight = new THREE.PointLight(0xffffff, 1.0);
        pointLight.position.set(5.0, 5.0, 5.0);
        scene.add(pointLight);

        worldViewer = wv.NewWorldViewer(scene, worldInfo, blockMaterial, workerInterface);
        viewPoint = new platform.ViewPoint(camera, pointLight, viewPort, renderer, worldInfo);
        culling = cu.NewCulling(camera, worldInfo);
        webcam = wc.NewWebcam(scene);
        interaction = int.NewInteraction(viewPort, scene, camera, workerInterface, worldInfo, webcam);
        textRenderer = tr.NewTextRenderer(workerInterface);

        // Expose API as global for console access
        api = _api.NewApi(workerInterface, viewPoint);

        win.api = api;

        blockMaterial.uniforms.webcam.value = webcam.getTexture();

        textRenderer.renderText(new THREE.Vector3(75, 5, 90), 'Welcome!');

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

    function setBlockType(blockTypeIndex: number) {
      return interaction.setType(blockTypeIndex);
    }

    function loadShaders(): Object {
      return Promise.all([
        win.fetch('shaders/block.vertex.glsl'),
        win.fetch('shaders/block.fragment.glsl')
      ])
        .then(function(res) {
        return Promise.all([res[0].text(), res[1].text()]);
      })
        .then(function(data) {
        vertexShader = data[0];
        fragmentShader = data[1];
      });

      return null;
    }

    return {
      init: init,
      getBlockTypes: getBlockTypes,
      setBlockType: setBlockType
    };
  }
}

export default Game;
