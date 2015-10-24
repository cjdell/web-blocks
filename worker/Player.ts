/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

export default class Player {
  private position: THREE.Vector3;
  private target: THREE.Vector3;

  changeListener: ((position: THREE.Vector3, target: THREE.Vector3) => void);

  constructor() {

  }

  update(position: THREE.Vector3, target: THREE.Vector3) {
    this.position = position;
    this.target = target;

    if (this.changeListener) this.changeListener(this.position, this.target);
  }

  getPosition() {
    return this.position;
  }

  getTarget() {
    return this.target;
  }

  setPosition(position: THREE.Vector3) {
    this.position = position;

    if (this.changeListener) this.changeListener(this.position, this.target);
  }

  setTarget(target: THREE.Vector3) {
    this.target = target;

    if (this.changeListener) this.changeListener(this.position, this.target);
  }
}
