/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');
import UserInterface = require('../ui/index.jsx');;

import com from '../common/WorldInfo';
import DesktopViewPoint from './DesktopViewPoint';
import WorkerInterface from './WorkerInterface';

export default class DesktopPlatform {
  renderer: THREE.WebGLRenderer = null;
  ui: UserInterface = null;
  viewPort: HTMLDivElement = null;

  constructor(container: HTMLDivElement) {
    this.ui = new UserInterface();

    this.ui.init(container);

    this.viewPort = this.ui.getViewPort();

    this.renderer = new THREE.WebGLRenderer();

    setTimeout(() => {
      this.renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
      this.renderer.setSize(this.viewPort.clientWidth, this.viewPort.clientHeight);

      this.viewPort.appendChild(this.renderer.domElement);
    }, 1000);
  }

  getViewPoint(camera: THREE.PerspectiveCamera, light: THREE.Light, viewPort: HTMLDivElement, renderer: THREE.Renderer, worldInfo: com.WorldInfo, workerInterface: WorkerInterface) {
    return new DesktopViewPoint(camera, light, viewPort, renderer, worldInfo, workerInterface);
  }

  getUserInterface() {
    return this.ui;
  }

  getRenderer() {
    return this.renderer;
  }

  getEffect() {
    return this.renderer;
  }

  getViewPort() {
    return this.viewPort;
  }
}
