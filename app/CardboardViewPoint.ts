import * as THREE from 'three';

import type { WorldInfo } from '../common/WorldInfo';
import { debounce } from '../common/Throttle';
import WorkerInterface from './WorkerInterface';
// Ported from the removed lib/DeviceOrientationControls.js fork; three's
// own example was dropped upstream (see app/DeviceOrientationControls.ts).
import DeviceOrientationControls from './DeviceOrientationControls';

export default class CardboardViewPoint {
  camera: THREE.PerspectiveCamera;
  // Callers (Game) pass null; guard the use below.
  light: THREE.Light | null;
  viewPort: HTMLDivElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  worldInfo: WorldInfo;
  workerInterface: WorkerInterface;

  controls: any = null;

  //camera.position.y = 12;
  //camera.position.z = 30;

  //controls = new THREE.OrbitControls(camera, container);
  //
  //controls.rotateUp(Math.PI / 4);
  //controls.target.set(camera.position.x + 0.1, camera.position.y, camera.position.z);
  //controls.noZoom = true;
  //controls.noPan = true;
  //controls.autoRotate = true;

  constructor(camera: THREE.PerspectiveCamera, light: THREE.Light | null, viewPort: HTMLDivElement, renderer: THREE.WebGLRenderer, scene: THREE.Scene, worldInfo: WorldInfo, workerInterface: WorkerInterface) {
    console.log('CardboardViewPoint');

    this.camera = camera;
    this.light = light;
    this.viewPort = viewPort;
    this.renderer = renderer;
    this.scene = scene;
    this.worldInfo = worldInfo;
    this.workerInterface = workerInterface;

    this.camera.position.x = 100;
    this.camera.position.y = 24;
    this.camera.position.z = 100;

    setInterval(() => {
      //camera.position.x += 0.01;

      //console.log(controls.getTheta);

      //console.log(controls.alpha, controls.beta, controls.gamma);

      const theta = this.controls.alpha + (Math.PI * 0.5);

      const movement = { x: 0, y: 0, z: -0.1 };

      camera.position.x -= (movement.z * -0.5) * Math.cos(theta) - (movement.x * 0.5) * Math.sin(theta);
      camera.position.z += (movement.z * -0.5) * Math.sin(theta) + (movement.x * 0.5) * Math.cos(theta);

      //camera.position.y += (movement.z * -0.5) * Math.cos(phi);

    }, 10);

    const fullscreen = () => {
      if (viewPort.requestFullscreen) {
        viewPort.requestFullscreen();
      } 
    }

    const setOrientationControls = (_e: any) => {
      this.controls = new DeviceOrientationControls(camera);
      this.controls.connect();
      this.controls.update();

      this.viewPort.addEventListener('click', fullscreen, false);
    }

    setOrientationControls(null);

    const onWindowResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      console.log('onWindowResize', width, height);

      if (renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    }

    window.addEventListener('resize', debounce(onWindowResize, 500), false);

    onWindowResize();
  }

  tick() {
    this.controls.update();

    // Move the light (Game passes null, so guard it)

    if (this.light) {
      this.light.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    }

    this.restrain(this.camera);
  }

  restrain(camera: THREE.Camera) {
    camera.position.x = Math.max(camera.position.x, 0);
    //camera.position.y = Math.max(camera.position.y, 0);
    camera.position.z = Math.max(camera.position.z, 0);

    camera.position.x = Math.min(camera.position.x, this.worldInfo.worldDimensionsInBlocks.x);
    //camera.position.y = Math.min(camera.position.y, blockDimensions.y);
    camera.position.z = Math.min(camera.position.z, this.worldInfo.worldDimensionsInBlocks.z);

    camera.position.y = 12;
  }
}

