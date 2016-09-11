"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');
import World from './World';
import com from '../common/WorldInfo';
import { Movement } from '../common/Types';
import { BlockTypeIds } from '../common/BlockTypeList';

const FPS = 60;

export default class Player {
  gravity = 0.0;
  changeListener: ((position: THREE.Vector3, target: THREE.Vector3) => void);
  print: ((msg: string) => void);

  rightClicked: boolean = false;
  mousePosition: { pos: com.IntVector3, side: number };
  boundScripts: { number: Function } | {} = {};

  private world: World;

  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private lastMovement: Movement;

  private lon = 0.0;
  private lat = 0.0;
  private xDelta = 0.0;
  private zDelta = 0.0;
  private lastFrame = Date.now();

  rightClick: Function = () => console.log("Right clicked!");

  constructor(world: World) {
    this.world = world;

    this.resetPlayer();
  }

  resetPlayer() {
    this.gravity = 9.8;

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
    if (this.gravity >= 0) {
      this.velocity.y = 5;
    } else {
      this.velocity.y = -5;
    }
  }

  tick() {
    this.walk();
  }

  walk() {
    const now = Date.now();
    const correction = (now - this.lastFrame) / (1000 / FPS);
    this.lastFrame = now;


    this.lon += this.lastMovement.turn.x * correction * 2;
    this.lat += this.lastMovement.turn.y * correction * 2;

    this.lat = Math.max(-89.9, Math.min(89.9, this.lat));

    const phi = this.lat * Math.PI / 180;
    const theta = this.lon * Math.PI / 180;

    const accel = 100 / FPS;

    let traction = 0;

    if ([BlockTypeIds.Air, BlockTypeIds.Glass].indexOf(this.getGround(this.position)) !== -1) {
      traction = 0.1;
    } else if ([BlockTypeIds.Water].indexOf(this.getGround(this.position)) !== -1) {
      traction = 4;
    } else {
      traction = 1;
    }

    this.zDelta = this.lastMovement.move.z * accel * traction;
    this.xDelta = this.lastMovement.move.x * accel * traction;

    this.zDelta = Math.min(this.zDelta, 10 * traction);
    this.xDelta = Math.min(this.xDelta, 5 * traction);
    this.zDelta = Math.max(this.zDelta, -10 * traction);
    this.xDelta = Math.max(this.xDelta, -5 * traction);

    const moveStep = new THREE.Vector3(this.xDelta, 0, this.zDelta);

    const shift = this.rotateStep(moveStep, phi, theta);

    this.velocity.x += shift.x;
    this.velocity.z += shift.z;

    // Friction
    this.velocity.x -= this.velocity.x * 0.1 * traction;
    this.velocity.z -= this.velocity.z * 0.1 * traction;


    this.velocity.y -= this.gravity / FPS;  // Gravity

    const inc = this.velocity.clone().multiplyScalar(correction / FPS);

    const nextPosition = this.position.clone().add(inc);
    const boundary = this.position.clone().add(this.velocity.clone().normalize());  // Give player a radius of 1 for CD

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

  getGround(position: THREE.Vector3) {
    const x = position.x | 0;
    const y = (position.y - 0.51) | 0;
    const z = position.z | 0;

    return this.world.getBlock(x, y, z);
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
