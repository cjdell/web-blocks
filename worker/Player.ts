"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');
import World from './World';
import com from '../common/WorldInfo';
import { Movement } from '../common/Types';

export default class Player {
  gravity = 0.002;
  changeListener: ((position: THREE.Vector3, target: THREE.Vector3) => void);
  print: ((msg: string) => void);

  rightClicked: boolean = false;
  mousePosition: { pos: com.IntVector3, side: number };
  boundScripts: { number: Function } | {} = {};

  private world: World;

  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private lastMovement: Movement;

  private lon = 180;
  private lat = 0;
  private xDelta = 0;
  private zDelta = 0;
  private lastFrame = Date.now();

  rightClick: Function = () => console.log("Right clicked!");

  constructor(world: World) {
    this.world = world;

    this.resetPlayer();
  }

  resetPlayer() {
    this.position = new THREE.Vector3(100, 24, 120);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.setDirection(new THREE.Vector2(0, 180));

    this.lastMovement = {
      move: new THREE.Vector3(0, 0, 0),
      turn: new THREE.Vector2(0, 0)
    };
  }

  move(movement: Movement) {
    this.lastMovement = movement;
  }

  jump() {
    if (this.gravity > 0) {
      this.velocity.y = 0.1;
    } else if (this.gravity < 0) {
      this.velocity.y = -0.1;
    }
  }

  tick() {
    if (this.gravity !== 0) {
      this.walk();
    } else {
      this.fly();
    }
  }

  fly() {
    const now = Date.now();
    const correction = (now - this.lastFrame) / (1000 / 60);
    this.lastFrame = now;

    this.zDelta += this.lastMovement.move.z * 0.01;         // Creep speed up as user presses W

    if (this.lastMovement.move.z === 0) this.zDelta = 0;   // Full stop

    this.lon -= this.lastMovement.turn.x * correction * 2;
    this.lat -= this.lastMovement.turn.y * correction * 2;

    this.lat = Math.max(-89.9, Math.min(89.9, this.lat));

    const phi = (90 - this.lat) * Math.PI / 180;
    const theta = (this.lon * Math.PI / 180);

    this.position.x += correction * ((this.zDelta * 0.5) * Math.cos(theta) + (this.lastMovement.move.x * 0.5) * Math.sin(theta));
    this.position.z += correction * ((this.zDelta * 0.5) * Math.sin(theta) - (this.lastMovement.move.x * 0.5) * Math.cos(theta));
    this.position.y += correction * ((this.zDelta * 0.5) * Math.cos(phi));

    const targetX = 2.0 * Math.sin(phi) * Math.cos(theta) + this.position.x;
    const targetY = 2.0 * Math.cos(phi) + this.position.y;
    const targetZ = 2.0 * Math.sin(phi) * Math.sin(theta) + this.position.z;

    const target = new THREE.Vector3(targetX, targetY, targetZ);

    if (this.changeListener) this.changeListener(this.position, target);
  }

  walk() {
    const now = Date.now();
    const correction = (now - this.lastFrame) / (1000 / 60);
    this.lastFrame = now;

    this.zDelta += this.lastMovement.move.z * correction * 0.02;         // Creep speed up as user presses W/S
    this.zDelta = this.lastMovement.move.z * Math.min(Math.abs(this.zDelta), 0.2);

    this.xDelta += this.lastMovement.move.x * correction * 0.02;         // Creep speed up as user presses A/D
    this.xDelta = this.lastMovement.move.x * Math.min(Math.abs(this.xDelta), 0.1);

    if (this.lastMovement.move.z === 0) this.zDelta = 0;   // Full stop
    if (this.lastMovement.move.x === 0) this.xDelta = 0;   // Full stop


    this.lon += this.lastMovement.turn.x * correction * 2;
    this.lat += this.lastMovement.turn.y * correction * 2;

    this.lat = Math.max(-89.9, Math.min(89.9, this.lat));

    const phi = this.lat * Math.PI / 180;
    const theta = this.lon * Math.PI / 180;

    this.velocity.y -= this.gravity;   // Gravity

    const moveStep = new THREE.Vector3(this.xDelta, 0, this.zDelta);
    moveStep.multiplyScalar(correction);

    const shift = this.rotateStep(moveStep, phi, theta);
    shift.y = this.velocity.y;

    const nextPosition = this.position.clone().add(shift);
    const boundary = this.position.clone().add(shift.normalize());  // Give player a radius of 1 for CD

    if (nextPosition.y < -100) {
      // Player has fallen through the world, reset
      this.resetPlayer();
      return;
    }

    this.clipMovement(nextPosition, boundary);

    // Camera target is 2 units (arbitary distance) in front of the view point
    const targetStep = new THREE.Vector3(0, 0, 2);
    const target = this.position.clone().add(this.rotateStep(targetStep, phi, theta));

    if (this.changeListener) this.changeListener(this.position, target);
  }

  rotateStep(step: THREE.Vector3, phi: number, theta: number) {
    const rotationZ = new THREE.Matrix4().makeRotationZ(0);
    const rotationX = new THREE.Matrix4().makeRotationX(phi);
    const rotationY = new THREE.Matrix4().makeRotationY(theta);
    const rotationXY = rotationY.multiply(rotationX);

    const shift = step.clone().applyMatrix4(rotationZ).applyMatrix4(rotationXY);

    return shift;
  }

  clipMovement(nextPosition: THREE.Vector3, boundary: THREE.Vector3) {
    const oldPosition = this.position;

    const test = (position: THREE.Vector3) => {
      if (position.x < 0) return false;
      if (position.z < 0) return false;

      if (position.x > this.world.worldInfo.worldDimensionsInBlocks.x) return false;
      if (position.z > this.world.worldInfo.worldDimensionsInBlocks.z) return false;

      const x = position.x | 0;
      const y = (position.y - 0.5) | 0;
      const z = position.z | 0;

      // I'm two blocks tall!
      const blockHead = this.world.getBlock(x, y + 1, z);
      const blockBody = this.world.getBlock(x, y, z);

      return blockBody === 0 && blockHead === 0;
    };

    const can = test(nextPosition);

    const canc = test(oldPosition);

    const canz = test(new THREE.Vector3(oldPosition.x, oldPosition.y, boundary.z));
    const canx = test(new THREE.Vector3(boundary.x, oldPosition.y, oldPosition.z));

    const cany = test(new THREE.Vector3(oldPosition.x, nextPosition.y, oldPosition.z));

    this.position = nextPosition;

    // If we're blocked in, don't do CD so we can escape (except for ground)

    if (canc) {
      // We're not blocked in

      if (!canz) {
        this.velocity.z = 0;
        this.position.z = oldPosition.z;
      }

      if (!canx) {
        this.velocity.x = 0;
        this.position.x = oldPosition.x;
      }

      if (!cany && this.velocity.y > 0) {
        this.velocity.y = 0;
        this.position.y = (nextPosition.y | 0) - 0.5;
      }
    }

    if (!cany && this.velocity.y < 0) {
      // Hit the ground
      this.velocity.y = 0;
      this.position.y = (nextPosition.y | 0) + 0.5;
    }

    return can;
  }

  onGround(position: THREE.Vector3) {
    const x = Math.floor(position.x);
    const y = Math.round(position.y) - 1;
    const z = Math.floor(position.z);

    const block = this.world.getBlock(x, y, z);

    return block !== 0;
  }

  update(position: THREE.Vector3, direction: THREE.Vector2) {
    this.position = position;

    this.lat = direction.x;
    this.lon = direction.y;
  }

  getPosition() {
    return this.position;
  }

  getDirection() {
    return new THREE.Vector2(this.lat, this.lon);
  }

  setPosition(position: THREE.Vector3) {
    this.position = position;
  }

  setDirection(direction: THREE.Vector2) {
    this.lat = direction.x;
    this.lon = direction.y;
  }
}
