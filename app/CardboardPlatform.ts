/// <reference path="../typings/index.d.ts" />
import * as THREE from 'three';
// The vendored 2015 forks in lib/ assigned onto the (no longer global)
// THREE object; use the maintained official example instead.
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';

import type { WorldInfo } from '../common/WorldInfo';
import CardboardViewPoint from './CardboardViewPoint';
import WorkerInterface from './WorkerInterface';

export default class CardboardPlatform {
  // var renderer = null;
  // var effect = null;
  // var viewPort = null;
  renderer: THREE.WebGLRenderer | null = null;
  effect: any = null;
  viewPort: HTMLDivElement | null = null;

  constructor(container: HTMLDivElement) {
    console.log('CardboardPlatform');

    this.renderer = new THREE.WebGLRenderer();
    this.viewPort = container;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
    this.renderer.setSize(width, height);

    container.appendChild(this.renderer.domElement);

    this.effect = new StereoEffect(this.renderer);
    this.effect.setSize(width, height);
  }

  getViewPoint(
    camera: THREE.PerspectiveCamera,
    light: THREE.Light,
    viewPort: HTMLDivElement,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    worldInfo: WorldInfo,
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
