/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');
import World from './World';

export interface Movement {
  move: THREE.Vector3;
  turn: THREE.Vector2;
}

export default class Player {
  private world: World;

  private position: THREE.Vector3;
  private velocity: THREE.Vector3;

  lon = 180;
  lat = 20;
  zDelta = 0;
  lastFrame = Date.now();

  changeListener: ((position: THREE.Vector3, target: THREE.Vector3) => void);

  lastMovement: Movement;

  constructor(world: World) {
    this.world = world;

    this.position = new THREE.Vector3(100, 24, 120);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.lastMovement = {
      move: new THREE.Vector3(0, 0, 0),
      turn: new THREE.Vector2(0, 0)
    };
  }

  move(movement: Movement) {
    this.lastMovement = movement;
  }

  jump() {
    this.velocity.y = 0.1;
  }

  tick() {
    const now = Date.now();
    const correction = (now - this.lastFrame) / (1000 / 60);
    this.lastFrame = now;

    this.zDelta += this.lastMovement.move.z * correction * 0.001;         // Creep speed up as user presses W
    this.zDelta = Math.min(this.zDelta, 0.2);

    if (this.lastMovement.move.z === 0) this.zDelta = 0;   // Full stop

    this.lon += this.lastMovement.turn.x * correction * 2;
    this.lat += this.lastMovement.turn.y * correction * 2;

    this.lat = Math.max(-89.9, Math.min(89.9, this.lat));

    const phi = this.lat * Math.PI / 180;
    const theta = (this.lon * Math.PI / 180);

    this.velocity.y -= 0.002;

    const moveStep = new THREE.Vector3(this.lastMovement.move.x * 0.05, 0, this.zDelta);
    moveStep.multiplyScalar(correction);
    const shift = this.rotateStep(moveStep, phi, theta);
    shift.y = this.velocity.y;
    const nextPosition = this.position.clone().add(shift);

    const boundary = this.position.clone().add(shift.normalize());

    if (this.onGround(nextPosition)) {
      nextPosition.y = Math.floor(nextPosition.y) + 0.5;
      this.velocity.y = 0;
    }

    if (this.canMove(boundary)) {
      this.position = nextPosition;
    } else {
      this.zDelta = 0;
      this.position.y = nextPosition.y;
    }

    // Camera target is 2 units (arbitary distance) in front of the view point
    const targetStep = new THREE.Vector3(0, 0, 2);
    const target = this.position.clone().add(this.rotateStep(targetStep, phi, theta));

    // this.restrain(this.position);

    if (this.changeListener) this.changeListener(this.position, target);
  }

  rotateStep(step: THREE.Vector3, phi: number, theta: number) {
    const rotation = new THREE.Vector3(phi, theta, 0);

    var rotationZ = new THREE.Matrix4().makeRotationZ(0);
    var rotationX = new THREE.Matrix4().makeRotationX(phi);
    var rotationY = new THREE.Matrix4().makeRotationY(theta);
    var rotationXY = rotationY.multiply(rotationX);

    const shift = step.clone().applyMatrix4(rotationZ).applyMatrix4(rotationXY);

    return shift;

    // newPosition.x = position.x + (step.z * Math.cos(theta) - step.x * Math.sin(theta));
    // newPosition.y = position.y + (step.z * Math.cos(phi));
    // newPosition.z = position.z + (step.z * Math.sin(theta) + step.x * Math.cos(theta));
  }

  canMove(position: THREE.Vector3) {
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    const z = Math.round(position.z);

    const block = this.world.getBlock(x, y, z);

    return block === 0;
  };

  onGround(position: THREE.Vector3) {
    const x = Math.round(position.x);
    const y = Math.round(position.y) - 1;
    const z = Math.round(position.z);

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
