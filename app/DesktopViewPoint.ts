"use strict";
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
  scene: THREE.Scene;
  worldInfo: com.WorldInfo;
  workerInterface: WorkerInterface;

  lastMousePosition: THREE.Vector2;
  mouseStop: boolean;
  mouseMovesScreen: boolean;
  pointerLock: boolean;
  trusted: boolean;

  position: THREE.Vector3;
  movement: THREE.Vector3;
  turn: THREE.Vector2;

  constructor(camera: THREE.PerspectiveCamera, light: THREE.Light, viewPort: HTMLDivElement, renderer: THREE.Renderer, scene: THREE.Scene, worldInfo: com.WorldInfo, workerInterface: WorkerInterface) {
    this.camera = camera;
    this.light = light;
    this.viewPort = viewPort;
    this.renderer = renderer;
    this.scene = scene;
    this.worldInfo = worldInfo;
    this.workerInterface = workerInterface;

    this.mouseStop = false;
    this.lastMousePosition = new THREE.Vector2();
    this.mouseMovesScreen = false;

    this.position = new THREE.Vector3(100, 24, 120);
    this.movement = new THREE.Vector3();
    this.turn = new THREE.Vector2();
    this.pointerLock = false;
    this.trusted = false;

    window.addEventListener('resize', _.debounce(() => this.onWindowResize(), 500), false);

    document.addEventListener('keydown', (e: any) => this.keyDown(e), false);
    document.addEventListener('keyup', (e: any) => this.keyUp(e), false);

    document.addEventListener('pointerlockchange', (e: any) => this.onPointerLockChange(e), false);
    this.viewPort.addEventListener("mousemove", (e: any) => this.mouseMove(e), false);
    document.addEventListener('visibilitychange', (e: any) => this.refreshPointerLock(), false);

    this.workerInterface.playerPositionListener = this.onPlayerPositionChanged.bind(this);
  }

  onPointerLockChange(event: any) {
    this.trusted = event.isTrusted;
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

    if (event.keyCode === 65) this.movement.x = 1;        // A (Left)
    if (event.keyCode === 68) this.movement.x = -1;       // D (Right)

    //if (event.keyCode === 38) movement.y = 1;           // Up Arrow (Elevate)
    //if (event.keyCode === 40) movement.y = -1;          // Down Arrow (Decline)

    if (event.keyCode === 87) this.movement.z = 1;        // W (Forwards)
    if (event.keyCode === 83) this.movement.z = -1;       // S (Backwards)

    if (event.keyCode === 38) this.turn.y = -1;           // Up Arrow (Turn Up)
    if (event.keyCode === 40) this.turn.y = 1;            // Down Arrow (Turn Down)

    if (event.keyCode === 37) this.turn.x = 1;            // Left Arrow (Turn Left)
    if (event.keyCode === 39) this.turn.x = -1;           // Right Arrow (Turn Right)

    if (event.shiftKey) {
      if (!document.pointerLockElement) {
        this.viewPort.requestPointerLock();
        this.pointerLock = true;
      } else if (this.trusted) {
        document.exitPointerLock();
        this.pointerLock = false;
      }
    }

    if (event.keyCode === 32 && !this.workerInterface.jumping) this.workerInterface.jump();

    this.workerInterface.move(this.movement, this.turn);
  }

  keyUp(event: any) {
    if (event.keyCode === 65) this.movement.x = 0;        // A (Left)
    if (event.keyCode === 68) this.movement.x = 0;        // D (Right)

    //if (event.keyCode === 38) movement.y = 0;           // Up Arrow (Elevate)
    //if (event.keyCode === 40) movement.y = 0;           // Down Arrow (Decline)

    if (event.keyCode === 87) this.movement.z = 0;        // W (Forwards)
    if (event.keyCode === 83) this.movement.z = 0;        // S (Backwards)

    if (event.keyCode === 38) this.turn.y = 0;            // Up Arrow (Turn Up)
    if (event.keyCode === 40) this.turn.y = 0;            // Down Arrow (Turn Down)

    if (event.keyCode === 37) this.turn.x = 0;            // Left Arrow (Turn Left)
    if (event.keyCode === 39) this.turn.x = 0;            // Right Arrow (Turn Right)

    if (event.keyCode === 32) this.workerInterface.jumping = false;

    if (event.keyCode === 27) this.refreshPointerLock();

    this.workerInterface.move(this.movement, this.turn);
  }


  mouseMove(event: any) {

    if ((<any>window).blockMovement || !this.pointerLock || !this.trusted || !document.pointerLockElement) {
      return;
    }

    this.turn.x = 100 * (-event.movementX) / event.srcElement.clientWidth;
    this.turn.y = 100 * (event.movementY) / event.srcElement.clientHeight;

    this.workerInterface.move(this.movement, this.turn);

    if (!this.mouseStop) {
      this.mouseStop = true;
      setTimeout(function () {
        this.turn.x = 0;
        this.turn.y = 0;
        this.workerInterface.move(this.movement, this.turn);
        this.mouseStop = false;
      }.bind(this), 10);
    }

    return false;
  }

  tick() {
    //this.workerInterface.move(this.movement, this.turn);
  }

  onPlayerPositionChanged(player: { position: THREE.Vector3, target: THREE.Vector3 }) {
    const PLAYER_HEIGHT = 1.0;

    player.position.y += PLAYER_HEIGHT;
    player.target.y += PLAYER_HEIGHT;

    this.position = player.position;

    this.camera.position.set(player.position.x, player.position.y, player.position.z);
    this.camera.lookAt(player.target);

    this.light.position.set(player.position.x, player.position.y, player.position.z);

    // this.dot(player.position, 0x0000ff);
    // this.dot(player.target, 0xff0000);
  }

  dot(pos: THREE.Vector3, colour: number) {
    // console.log(pos);

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: colour });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
    this.scene.add(cube);
  }

  // restrain(position: THREE.Vector3) {
  //   position.x = Math.max(position.x, 0);
  //   position.y = Math.max(position.y, 0);
  //   position.z = Math.max(position.z, 0);

  //   position.x = Math.min(position.x, this.worldInfo.worldDimensionsInBlocks.x);
  //   position.y = Math.min(position.y, this.worldInfo.worldDimensionsInBlocks.y * 2);
  //   position.z = Math.min(position.z, this.worldInfo.worldDimensionsInBlocks.z);
  // }

  getPosition() {
    return this.position;
  }

  setPosition(pos: THREE.Vector3) {
    this.position.set(pos.x, pos.y, pos.z);
  }

  refreshPointerLock() {
    if (document.visibilityState == "hidden") {
      this.pointerLock = false;
    }

    if (!(<any>window).blockMovement
        && this.viewPort
        && this.pointerLock
        && this.trusted) {
      this.viewPort.requestPointerLock();
    }
  }
}
