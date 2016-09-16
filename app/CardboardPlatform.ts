"use strict";
/// <reference path="../typings/index.d.ts" />
import THREE = require('three');

require('../lib/StereoEffect');
require('../lib/DeviceOrientationControls');
require('../lib/OrbitControls');

import com from '../common/WorldInfo';
import CardboardViewPoint from './CardboardViewPoint';
import WorkerInterface from './WorkerInterface';

export default class CardboardPlatform {
  // var renderer = null;
  // var effect = null;
  // var viewPort = null;
  renderer: THREE.WebGLRenderer = null;
  effect: any = null;
  viewPort: HTMLDivElement = null;

  constructor(container: HTMLDivElement) {
    console.log('CardboardPlatform');

    this.renderer = new THREE.WebGLRenderer();
    this.viewPort = container;

    var width = window.innerWidth, height = window.innerHeight;

    this.renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
    this.renderer.setSize(width, height);

    container.appendChild(this.renderer.domElement);

    this.effect = new (THREE as any).StereoEffect(this.renderer);
    this.effect.setSize(width, height);
  }

  getViewPoint(
    camera: THREE.PerspectiveCamera,
    light: THREE.Light,
    viewPort: HTMLDivElement,
    renderer: THREE.Renderer,
    scene: THREE.Scene,
    worldInfo: com.WorldInfo,
    workerInterface: WorkerInterface) {
    return new CardboardViewPoint(camera, light, viewPort, renderer, scene, worldInfo, workerInterface);
  }

  getUserInterface(): any {
    return null;
  }

  getRenderer() {
    return this.renderer;
  }

  getEffect() {
    return this.effect;
  }

  getViewPort() {
    return this.viewPort;
  }
}
