"use strict";
import THREE = require('three');

import com from '../common/WorldInfo';
import Culling from './Culling';
import { BlockTypeList, BlockType } from '../common/BlockTypeList';
import Interaction from './Interaction';
import WorldViewer from './WorldViewer';
import WorkerInterface from './WorkerInterface';
import Webcam from './Webcam';
import TextRenderer from './TextRenderer';
import DesktopPlatform from './DesktopPlatform';
import CardboardPlatform from './CardboardPlatform';
import DesktopViewPoint from './DesktopViewPoint';
import CardboardViewPoint from './CardboardViewPoint';

const win = <any>self;

const MAX_TYPE_COUNT = 16.0;

export default class Game {
  platform: DesktopPlatform | CardboardPlatform;

  log = false;

  workerInterface: WorkerInterface = null;
  renderer: any = null;
  effect: any = null;
  viewPort: HTMLDivElement = null;
  camera: THREE.PerspectiveCamera = null;
  scene: THREE.Scene = null;
  blockTypeList: BlockTypeList = null;
  worldViewer: WorldViewer = null;
  viewPoint: DesktopViewPoint | CardboardViewPoint = null;
  culling: any = null;
  interaction: Interaction = null;
  webcam: Webcam = null;
  textRenderer: TextRenderer = null;

  uniforms: any = null;
  frame = 0;

  vertexShader: string = null;
  fragmentShader: string = null;

  constructor(platform: DesktopPlatform | CardboardPlatform) {
    this.platform = platform;

    this.workerInterface = new WorkerInterface();

    this.renderer = platform.getRenderer();
    this.effect = platform.getEffect();
    this.viewPort = platform.getViewPort();

    this.renderer.setClearColor(0xffffff, 1);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.scene = new THREE.Scene();

    this.scene.fog = new THREE.FogExp2(0xffffff, 0.0025);

    this.blockTypeList = new BlockTypeList();
  }

  init() {
    return Promise.all([this.workerInterface.init(), this.loadShaders()]).then(res => {
      const worldInfo = new com.WorldInfo(<com.WorldInfo>res[0]);

      this.uniforms = {};

      this.uniforms.textures = { type: 't', value: null };
      // this.uniforms.webcam = { type: 't', value: null };
      this.uniforms.color = { type: 'f', value: 1.0 };
      this.uniforms.time = { type: 'f', value: 0.0 };

      // const attributes: any = {
      //   data: { type: 'v4', value: null },
      //   offset: { type: 'f', value: null }
      // };

      const blockMaterial = new THREE.RawShaderMaterial({
        // attributes,
        uniforms: this.uniforms,
        vertexShader: this.vertexShader,
        fragmentShader: this.fragmentShader,
        vertexColors: THREE.VertexColors,
        transparent: false
      });

      const blockTypes = this.blockTypeList.getBlockTypes();

      this.getBlockTexture(blockTypes).then((texture: THREE.Texture) => {
        blockMaterial.uniforms.textures.value = texture;
      });

      this.worldViewer = new WorldViewer(this.scene, worldInfo, blockMaterial, this.workerInterface);
      this.viewPoint = this.platform.getViewPoint(this.camera, null, this.viewPort, this.effect, this.scene, worldInfo, this.workerInterface);
      this.culling = new Culling(this.camera, worldInfo);
      this.webcam = new Webcam();
      this.interaction = new Interaction(this.viewPort, this.scene, this.camera, this.workerInterface, worldInfo, this.webcam);
      this.textRenderer = new TextRenderer(this.workerInterface);

      win.workerInterface = this.workerInterface;

      // blockMaterial.uniforms.webcam.value = this.webcam.getTexture();

      this.textRenderer.renderText(new THREE.Vector3(75, 5, 90), 'Welcome!');

      this.render(); // Kick off the render loop
    });
  }

  render() {
    requestAnimationFrame(() => this.render());

    this.webcam.render();

    this.uniforms.time.value += 0.1;

    this.viewPoint.tick();

    this.frame += 1;

    if (this.frame % 20 === 0) {
      const changes = this.culling.getNewlyVisiblePartitions();

      this.worldViewer.exposeNewPartitions(changes);
    }

    // if (this.frame % 3 === 0) {
    this.effect.render(this.scene, this.camera);
    // }

    if (this.log) console.timeEnd('frame');
  }

  getBlockTypes() {
    return this.blockTypeList.getBlockTypes();
  }

  setBlockType(blockTypeIndex: number) {
    return this.interaction.setType(blockTypeIndex);
  }

  getAvailableTools() {
    if (!this.interaction) return [];

    return this.interaction.getAvailableTools();
  }

  setTool(toolType: string) {
    return this.interaction.setToolType(toolType);
  }

  setGravity(gravity: number) {
    return this.workerInterface.setGravity(gravity);
  }

  loadShaders(): Promise<Object> {
    return Promise.all([
      win.fetch('shaders/block.vertex.glsl'),
      win.fetch('shaders/block.fragment.glsl')
    ]).then(res => {
      return Promise.all([res[0].text(), res[1].text()]);
    }).then(data => {
      this.vertexShader = data[0];
      this.fragmentShader = data[1];

      return null;
    });
  }

  getBlockTexture(blockTypes: Array<BlockType>) {
    const canvas = document.createElement('canvas');

    canvas.width = MAX_TYPE_COUNT * 16;
    canvas.height = MAX_TYPE_COUNT * 16;

    const ctx = <CanvasRenderingContext2D>canvas.getContext('2d');

    const blockTypePromises = blockTypes.map((blockType, index) => {
      if (blockType.textures.top === null) return null;

      const top = this.getImage(blockType.textures.top);
      const side = this.getImage(blockType.textures.side);

      return Promise.all([top, side]).then((results) => {
        const top = results[0], side = results[1];

        ctx.drawImage(top, 0, (MAX_TYPE_COUNT - index - 1) * 16, 16, 16);
        ctx.drawImage(side, 16, (MAX_TYPE_COUNT - index - 1) * 16, 16, 16);
      });
    });

    return Promise.all(blockTypePromises).then(() => {
      const texture = new THREE.Texture(canvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.LinearMipMapLinearFilter);
      texture.needsUpdate = true;
      return texture;
    });
  }

  getImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        return resolve(image);
      };

      image.onerror = () => {
        return reject();
      };

      image.src = src;
    });
  }
}
