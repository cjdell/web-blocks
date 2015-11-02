/// <reference path="../typings/tsd.d.ts" />
import _ = require('underscore');
import THREE = require('three');

import com from '../common/WorldInfo';
import WorkerInterface from './WorkerInterface';

export default class DesktopViewPoint {
  camera: THREE.PerspectiveCamera;
  light: THREE.Light;
  viewPort: HTMLDivElement;
  renderer: THREE.Renderer;
  worldInfo: com.WorldInfo;
  workerInterface: WorkerInterface;

  position: THREE.Vector3;
  movement: THREE.Vector3;
  turn: THREE.Vector2;

  speed = 10;

  lon = 270;
  lat = -20;
  zDelta = 0;
  lastFrame = Date.now();

  constructor(camera: THREE.PerspectiveCamera, light: THREE.Light, viewPort: HTMLDivElement, renderer: THREE.Renderer, worldInfo: com.WorldInfo, workerInterface: WorkerInterface) {
    this.camera = camera;
    this.light = light;
    this.viewPort = viewPort;
    this.renderer = renderer;
    this.worldInfo = worldInfo;
    this.workerInterface = workerInterface;

    this.position = new THREE.Vector3(100, 24, 120);
    this.movement = new THREE.Vector3();
    this.turn = new THREE.Vector2();

    window.addEventListener('resize', _.debounce(() => this.onWindowResize(), 500), false);

    document.addEventListener('keydown', (e: any) => this.keyDown(e), false);
    document.addEventListener('keyup', (e: any) => this.keyUp(e), false);

    this.workerInterface.playerPositionListener = this.onPlayerPositionChanged.bind(this);
  }

  onWindowResize() {
    var width = this.viewPort.clientWidth, height = this.viewPort.clientHeight;

    console.log('onWindowResize', width, height);

    if (this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
    }
  }

  keyDown(event: any) {
    if ((<any>window).blockMovement) return;

    if (event.keyCode === 65) this.movement.x = -1;      // A (Left)
    if (event.keyCode === 68) this.movement.x = 1;       // D (Right)

    //if (event.keyCode === 38) movement.y = 1;       // Up Arrow (Elevate)
    //if (event.keyCode === 40) movement.y = -1;      // Down Arrow (Decline)

    if (event.keyCode === 87) this.movement.z = -1;      // W (Forwards)
    if (event.keyCode === 83) this.movement.z = 1;       // S (Backwards)

    if (event.keyCode === 38) this.turn.y = 1;       // Up Arrow (Turn Up)
    if (event.keyCode === 40) this.turn.y = -1;      // Down Arrow (Turn Down)

    if (event.keyCode === 37) this.turn.x = -1;      // Left Arrow (Turn Left)
    if (event.keyCode === 39) this.turn.x = 1;       // Right Arrow (Turn Right)
  }

  keyUp(event: any) {
    if (event.keyCode === 65) this.movement.x = 0;       // A (Left)
    if (event.keyCode === 68) this.movement.x = 0;       // D (Right)

    //if (event.keyCode === 38) movement.y = 0;       // Up Arrow (Elevate)
    //if (event.keyCode === 40) movement.y = 0;       // Down Arrow (Decline)

    if (event.keyCode === 87) this.movement.z = 0;       // W (Forwards)
    if (event.keyCode === 83) this.movement.z = 0;       // S (Backwards)

    if (event.keyCode === 38) this.turn.y = 0;       // Up Arrow (Turn Up)
    if (event.keyCode === 40) this.turn.y = 0;       // Down Arrow (Turn Down)

    if (event.keyCode === 37) this.turn.x = 0;       // Left Arrow (Turn Left)
    if (event.keyCode === 39) this.turn.x = 0;       // Right Arrow (Turn Right)
  }

  tick() {
    var now = Date.now();

    var correction = (now - this.lastFrame) / (1000 / 60);

    this.lastFrame = now;

    this.zDelta += this.movement.z * 0.01;         // Creep speed up as user presses W

    if (this.movement.z === 0) this.zDelta = 0;   // Full stop

    this.lon += this.turn.x * correction * 2;
    this.lat += this.turn.y * correction * 2;

    this.lat = Math.max(-89.9, Math.min(89.9, this.lat));

    var phi = (90 - this.lat) * Math.PI / 180;
    var theta = (this.lon * Math.PI / 180);

    //console.log(phi, theta);

    this.position.x += correction * ((this.zDelta * -0.5) * Math.cos(theta) - (this.movement.x * 0.5) * Math.sin(theta));
    this.position.z += correction * ((this.zDelta * -0.5) * Math.sin(theta) + (this.movement.x * 0.5) * Math.cos(theta));
    this.position.y += correction * ((this.zDelta * -0.5) * Math.cos(phi));

    var targetX = 2.0 * Math.sin(phi) * Math.cos(theta) + this.position.x;
    var targetY = 2.0 * Math.cos(phi) + this.position.y;
    var targetZ = 2.0 * Math.sin(phi) * Math.sin(theta) + this.position.z;

    var target = new THREE.Vector3(targetX, targetY, targetZ);

    this.restrain(this.position);

    this.workerInterface.setPlayerPosition(this.position, target);
  }

  onPlayerPositionChanged(player: { position: THREE.Vector3, target: THREE.Vector3 }) {
    this.position = player.position;

    this.camera.position.set(player.position.x, player.position.y, player.position.z);
    this.camera.lookAt(player.target);

    this.light.position.set(player.position.x, player.position.y, player.position.z);
  }

  restrain(position: THREE.Vector3) {
    position.x = Math.max(position.x, 0);
    position.y = Math.max(position.y, 0);
    position.z = Math.max(position.z, 0);

    position.x = Math.min(position.x, this.worldInfo.worldDimensionsInBlocks.x);
    position.y = Math.min(position.y, this.worldInfo.worldDimensionsInBlocks.y * 2);
    position.z = Math.min(position.z, this.worldInfo.worldDimensionsInBlocks.z);
  }

  getPosition() {
    return this.position;
  }

  setPosition(pos: THREE.Vector3) {
    this.position.set(pos.x, pos.y, pos.z);
  }

  getTarget() {
    return { lon: this.lon, lat: this.lat };
  }

  setTarget(target: any) {
    this.lon = target.lon;
    this.lat = target.lat;
  }
}
