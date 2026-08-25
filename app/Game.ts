import * as THREE from 'three';
import { WorldInfo } from '../common/WorldInfo';
import Culling from './Culling';
import Interaction from './Interaction';
import WorldViewer from './WorldViewer';
import WorkerInterface from './WorkerInterface';
import TextRenderer from './TextRenderer';
import DesktopPlatform from './DesktopPlatform';
import DesktopViewPoint from './DesktopViewPoint';

import { BlockTypeList, BlockType } from '../common/BlockTypeList';

import { BoundScriptsChangeListener } from '../common/Types';

const win = <any>self;

const MAX_TYPE_COUNT = 16.0;

export default class Game {
  platform: DesktopPlatform;

  log = false;

  // workerInterface/renderer/effect/viewPort/camera/scene/blockTypeList are
  // assigned in the constructor; the rest in init() before the render loop
  // starts (strictPropertyInitialization).
  workerInterface!: WorkerInterface;
  renderer: any = null;
  effect: any = null;
  viewPort!: HTMLDivElement;
  camera!: THREE.PerspectiveCamera;
  scene!: THREE.Scene;
  blockTypeList!: BlockTypeList;
  worldViewer!: WorldViewer;
  viewPoint!: DesktopViewPoint;
  culling!: Culling;
  interaction!: Interaction;
  textRenderer!: TextRenderer;

  uniforms!: any;
  frame = 0;

  // Loaded via loadShaders(), which init() awaits before first use.
  vertexShader!: string;
  fragmentShader!: string;

  constructor(platform: DesktopPlatform) {
    this.platform = platform;

    this.workerInterface = new WorkerInterface();

    this.renderer = platform.getRenderer();
    this.effect = platform.getEffect();
    this.viewPort = platform.getViewPort();

    this.renderer.setClearColor(0xffffff, 1);

    // Debug hook: expose the live Game so headless diagnostic harnesses can
    // read the camera / scene / worldViewer (rendered geometry) and freeze the
    // camera. Off in normal use but harmless. (Same hook the ao-* tools use.)
    // (globalThis as any).__game = this;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    this.scene = new THREE.Scene();

    this.scene.fog = new THREE.FogExp2(0xffffff, 0.0025);

    this.blockTypeList = new BlockTypeList();
  }

  init() {
    return Promise.all([this.workerInterface.init(), this.loadShaders()]).then((res) => {
      const worldInfo = new WorldInfo(res[0]);

      this.uniforms = {};

      this.uniforms.textures = { type: 't', value: null };
      this.uniforms.color = { type: 'f', value: 1.0 };
      this.uniforms.time = { type: 'f', value: 0.0 };

      const blockMaterial = new THREE.RawShaderMaterial({
        // attributes,
        uniforms: this.uniforms,
        vertexShader: this.vertexShader,
        fragmentShader: this.fragmentShader,
        transparent: false,
      });

      const blockTypes = this.blockTypeList.getBlockTypes();

      this.getBlockTexture(blockTypes).then((texture) => {
        blockMaterial.uniforms.textures.value = texture;
      });

      this.worldViewer = new WorldViewer(
        this.scene,
        worldInfo,
        blockMaterial,
        this.workerInterface,
      );
      this.viewPoint = this.platform.getViewPoint(
        this.camera,
        null,
        this.viewPort,
        this.effect,
        this.scene,
        worldInfo,
        this.workerInterface,
      );
      this.culling = new Culling(this.camera, worldInfo);
      this.interaction = new Interaction(
        this.viewPort,
        this.scene,
        this.camera,
        this.workerInterface,
        worldInfo,
      );
      this.textRenderer = new TextRenderer(this.workerInterface);

      win.workerInterface = this.workerInterface;

      this.textRenderer.renderText(new THREE.Vector3(75, 5, 90), 'Welcome!');

      this.render(); // Kick off the render loop
    });
  }

  render() {
    requestAnimationFrame(() => this.render());

    this.uniforms.time.value += 0.1;

    this.viewPoint.tick();

    this.frame += 1;

    if (this.frame % 20 === 0) {
      const changes = this.culling.getNewlyVisiblePartitions();

      this.worldViewer.exposeNewPartitions(changes);
    }

    // if (this.frame % 10 === 0) {
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

  loadShaders(): Promise<object> {
    // `no-store`: shaders are fetched fresh from source at runtime, so never
    // let the browser serve a stale cached copy. Without this a leftover
    // fragment shader can stay stuck in the fetch cache across edits, which
    // silently inverts/alters the rendered lighting (e.g. a leftover
    // `1 - max(vLight,...)` surviving in cache).
    return Promise.all([
      win.fetch('shaders/block.vertex.glsl', { cache: 'no-store' }),
      win.fetch('shaders/block.fragment.glsl', { cache: 'no-store' }),
    ])
      .then((res) => {
        return Promise.all([res[0].text(), res[1].text()]);
      })
      .then((data) => {
        this.vertexShader = data[0];
        this.fragmentShader = data[1];

        return null as any;
      });
  }

  getBlockTexture(blockTypes: Array<BlockType>) {
    const canvas = document.createElement('canvas');

    canvas.width = MAX_TYPE_COUNT * 16;
    canvas.height = MAX_TYPE_COUNT * 16;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const blockTypePromises = blockTypes.map((blockType, index) => {
      if (blockType.textures.top === null || blockType.textures.side === null) return null;

      const top = this.getImage(blockType.textures.top);
      const side = this.getImage(blockType.textures.side);

      return Promise.all([top, side]).then((results) => {
        const top = results[0],
          side = results[1];

        ctx.drawImage(top, 0, (MAX_TYPE_COUNT - index - 1) * 16, 16, 16);
        ctx.drawImage(side, 16, (MAX_TYPE_COUNT - index - 1) * 16, 16, 16);
      });
    });

    return Promise.all(blockTypePromises).then(() => {
      // The extra Texture constructor arguments (mapping, wrap, filters)
      // were removed in three r132+; set them as properties instead.
      const texture = new THREE.Texture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.LinearMipMapLinearFilter;
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

  onBoundScriptsChange(listener: BoundScriptsChangeListener) {
    this.workerInterface.onBoundScriptsChange(listener);
  }
}
