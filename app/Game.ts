import THREE = require('three');

import Culling from './Culling';
import BlockTypeList from './BlockTypeList';
import Interaction from './Interaction';
import WorldViewer from './WorldViewer';
import WorkerInterface from './WorkerInterface';
import _api from './Api';
import Webcam from './Webcam';
import TextRenderer from './TextRenderer';
import com from '../common/Common';

module Game {
  export interface Game {
    init(platform: any): Promise<void>;
  }

  export function NewGame() {
    const win = <any>self;
    const log = false;

    let workerInterface: WorkerInterface = null;
    let renderer: any = null;
    let effect: any = null;
    let viewPort: any = null;
    let camera: THREE.Camera = null;
    let scene: THREE.Scene = null;
    let blockTypeList: BlockTypeList = null;
    let worldViewer: WorldViewer = null;
    let viewPoint: any = null;
    let culling: any = null;
    let interaction: Interaction = null;
    let api: _api.Api = null;
    let webcam: Webcam = null;
    let textRenderer: TextRenderer = null;

    let uniforms: any = null;
    let frame = 0;

    let vertexShader: string = null;
    let fragmentShader: string = null;

    function init(platform: any): Promise<void> {
      workerInterface = new WorkerInterface();

      renderer = platform.getRenderer();
      effect = platform.getEffect();
      viewPort = platform.getViewPort();

      renderer.setClearColor(0xffffff, 1);

      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

      scene = new THREE.Scene();

      scene.fog = new THREE.FogExp2(0xffffff, 0.0025);

      blockTypeList = new BlockTypeList();

      return Promise.all([workerInterface.init(), loadShaders()]).then(function(res) {
        const worldInfo = new com.WorldInfo(<com.WorldInfo>res[0]);

        uniforms = {};

        uniforms.textures = { type: 't', value: null };
        uniforms.webcam = { type: 't', value: null };
        uniforms.color = { type: 'f', value: 1.0 };
        uniforms.time = { type: 'f', value: 0.0 };

        uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['lights'], uniforms]);
        uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['fog'], uniforms]);

        const attributes: any = {
          data: { type: 'v4', value: null },
          offset: { type: 'f', value: null }
        };

        const blockMaterial = new THREE.ShaderMaterial({
          attributes: attributes,
          uniforms: uniforms,
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          vertexColors: THREE.VertexColors,
          transparent: false,
          lights: true,
          fog: true
        });

        //let blockMaterial = new THREE.MeshLambertMaterial({ color: 0xbbccff });

        blockTypeList.getBlockTexture().then(function(texture) {
          blockMaterial.uniforms.textures.value = texture;
        });

        const ambientLight = new THREE.AmbientLight(0x777777);
        scene.add(ambientLight);

        // Create light
        const pointLight = new THREE.PointLight(0xffffff, 1.0);
        pointLight.position.set(5.0, 5.0, 5.0);
        scene.add(pointLight);

        worldViewer = new WorldViewer(scene, worldInfo, blockMaterial, workerInterface);
        viewPoint = new platform.ViewPoint(camera, pointLight, viewPort, effect, worldInfo);
        culling = new Culling(camera, worldInfo);
        webcam = new Webcam();
        interaction = new Interaction(viewPort, scene, camera, workerInterface, worldInfo, webcam);
        textRenderer = new TextRenderer(workerInterface);

        // Expose API as global for console access
        api = _api.NewApi(workerInterface, viewPoint);

        win.api = api;

        blockMaterial.uniforms.webcam.value = webcam.getTexture();

        textRenderer.renderText(new THREE.Vector3(75, 5, 90), 'Welcome!');

        // workerInterface.setBlocks(new com.IntVector3(80, 1, 80), new com.IntVector3(120, 31, 120), 0, 0, false);

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
        const changes = culling.getNewlyVisiblePartitions();

        worldViewer.exposeNewPartitions(changes);
      }

      effect.render(scene, camera);

      if (log) console.timeEnd('frame');
    }

    function getBlockTypes() {
      return blockTypeList.getBlockTypes();
    }

    function setBlockType(blockTypeIndex: number) {
      return interaction.setType(blockTypeIndex);
    }

    function loadShaders(): Promise<any> {
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
