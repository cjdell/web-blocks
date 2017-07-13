/// <reference path="../typings/index.d.ts" />
import _ = require('underscore');
import THREE = require('three');

import com from '../common/WorldInfo';
import WorkerInterface from './WorkerInterface';

export default class CardboardViewPoint {
  camera: THREE.PerspectiveCamera;
  light: THREE.Light;
  viewPort: HTMLDivElement;
  renderer: THREE.Renderer;
  scene: THREE.Scene;
  worldInfo: com.WorldInfo;
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

  constructor(camera: THREE.PerspectiveCamera, light: THREE.Light, viewPort: HTMLDivElement, renderer: THREE.Renderer, scene: THREE.Scene, worldInfo: com.WorldInfo, workerInterface: WorkerInterface) {
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

      var theta = this.controls.alpha + (Math.PI * 0.5);
      var phi = 0;

      var movement = { x: 0, y: 0, z: -0.1 };

      camera.position.x -= (movement.z * -0.5) * Math.cos(theta) - (movement.x * 0.5) * Math.sin(theta);
      camera.position.z += (movement.z * -0.5) * Math.sin(theta) + (movement.x * 0.5) * Math.cos(theta);

      //camera.position.y += (movement.z * -0.5) * Math.cos(phi);

    }, 10);

    const fullscreen = () => {
      if (viewPort.requestFullscreen) {
        viewPort.requestFullscreen();
        // } else if (viewPort.msRequestFullscreen) {
        //   viewPort.msRequestFullscreen();
        // } else if (viewPort.mozRequestFullScreen) {
        //   viewPort.mozRequestFullScreen();
      } else if (viewPort.webkitRequestFullscreen) {
        viewPort.webkitRequestFullscreen();
      }
    }

    const setOrientationControls = (e: any) => {
      this.controls = new (THREE as any).DeviceOrientationControls(camera, true);
      this.controls.connect();
      this.controls.update();

      this.viewPort.addEventListener('click', fullscreen, false);
    }

    setOrientationControls(null);

    const onWindowResize = () => {
      var width = window.innerWidth, height = window.innerHeight;

      console.log('onWindowResize', width, height);

      if (renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    }

    window.addEventListener('resize', _.debounce(onWindowResize, 500), false);

    onWindowResize();
  }

  tick() {
    this.controls.update();

    // Move the light

    this.light.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);

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

