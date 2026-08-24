/**
 * DeviceOrientationControls - applies device orientation on object rotation.
 *
 * TypeScript port of the 2015 fork that used to live in
 * lib/DeviceOrientationControls.js (itself a fork of three's old
 * examples/js/controls/DeviceOrientationControls.js, which was removed from
 * three). Kept for the (currently disabled) Cardboard platform; see
 * MODERNISATION_REPORT.md P3.8 for the product decision on its fate.
 *
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/mrdoob
 * @author jonobr1 / http://jonobr1.com
 * @author arodic / http://github.com/aleksandarrodic
 * @author doug / http://github.com/doug
 *
 * W3C Device Orientation control
 * (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */
import * as THREE from 'three';

export default class DeviceOrientationControls {
  object: THREE.PerspectiveCamera;

  freeze = true;

  movementSpeed = 1.0;
  rollSpeed = 0.005;
  autoAlign = true;
  autoForward = false;

  alpha = 0;
  beta = 0;
  gamma = 0;
  orient = 0;

  alignQuaternion = new THREE.Quaternion();
  orientationQuaternion = new THREE.Quaternion();

  deviceOrientation: any = {};
  screenOrientation: number = 0;

  private quaternion = new THREE.Quaternion();
  private quaternionLerp = new THREE.Quaternion();

  private tempVector3 = new THREE.Vector3();
  private tempMatrix4 = new THREE.Matrix4();
  private tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private tempQuaternion = new THREE.Quaternion();

  private zee = new THREE.Vector3(0, 0, 1);
  private up = new THREE.Vector3(0, 1, 0);
  private v0 = new THREE.Vector3(0, 0, 0);
  private euler = new THREE.Euler();
  private q0 = new THREE.Quaternion(); // - PI/2 around the x-axis
  private q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

  constructor(object: THREE.PerspectiveCamera) {
    this.object = object;

    this.object.rotation.reorder('YXZ');

    this.screenOrientation = (window as any).orientation || 0;

    this.onDeviceOrientationChangeEvent = this.onDeviceOrientationChangeEvent.bind(this);
    this.onScreenOrientationChangeEvent = this.onScreenOrientationChangeEvent.bind(this);
    this.update = this.update.bind(this);
    this.align = this.align.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  private onDeviceOrientationChangeEvent(rawEvtData: any) {
    this.deviceOrientation = rawEvtData;
  }

  private onScreenOrientationChangeEvent() {
    this.screenOrientation = this.getOrientation();
  }

  private getOrientation(): number {
    // window.orientation was removed from browsers; the legacy fallback
    // simply resolves to 0 on modern platforms.
    switch ((window.screen as any).orientation || (window.screen as any).mozOrientation) {
      case 'landscape-primary':
        return 90;
      case 'landscape-secondary':
        return -90;
      case 'portrait-secondary':
        return 180;
      case 'portrait-primary':
        return 0;
    }
    return (window as any).orientation || 0;
  }

  update(_delta?: number) {
    if (this.freeze) return;

    // should not need this
    const orientation = this.getOrientation();
    if (orientation !== this.screenOrientation) {
      this.screenOrientation = orientation;
      this.autoAlign = true;
    }

    this.alpha = this.deviceOrientation.gamma
      ? THREE.MathUtils.degToRad(this.deviceOrientation.alpha)
      : 0; // Z
    this.beta = this.deviceOrientation.beta
      ? THREE.MathUtils.degToRad(this.deviceOrientation.beta)
      : 0; // X'
    this.gamma = this.deviceOrientation.gamma
      ? THREE.MathUtils.degToRad(this.deviceOrientation.gamma)
      : 0; // Y''
    this.orient = this.screenOrientation
      ? THREE.MathUtils.degToRad(this.screenOrientation)
      : 0; // O

    // The angles alpha, beta and gamma
    // form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

    // 'ZXY' for the device, but 'YXZ' for us
    this.euler.set(this.beta, this.alpha, -this.gamma, 'YXZ');

    this.quaternion.setFromEuler(this.euler);
    this.quaternionLerp.slerp(this.quaternion, 0.5); // interpolate

    // orient the device
    if (this.autoAlign) this.orientationQuaternion.copy(this.quaternion); // interpolation breaks the auto alignment
    else this.orientationQuaternion.copy(this.quaternionLerp);

    // camera looks out the back of the device, not the top
    this.orientationQuaternion.multiply(this.q1);

    // adjust for screen orientation
    this.orientationQuaternion.multiply(this.q0.setFromAxisAngle(this.zee, -this.orient));

    this.object.quaternion.copy(this.alignQuaternion);
    this.object.quaternion.multiply(this.orientationQuaternion);

    if (this.autoForward) {
      this.tempVector3
        .set(0, 0, -1)
        .applyQuaternion(this.object.quaternion)
        .setLength(this.movementSpeed / 50); // TODO: why 50 :S

      this.object.position.add(this.tempVector3);
    }

    if (this.autoAlign && this.alpha !== 0) {
      this.autoAlign = false;

      this.align();
    }
  }

  align() {
    this.tempVector3
      .set(0, 0, -1)
      .applyQuaternion(this.tempQuaternion.copy(this.orientationQuaternion).invert());

    this.tempEuler.setFromQuaternion(
      this.tempQuaternion.setFromRotationMatrix(
        this.tempMatrix4.lookAt(this.tempVector3, this.v0, this.up)
      )
    );

    this.tempEuler.set(0, this.tempEuler.y, 0);
    this.alignQuaternion.setFromEuler(this.tempEuler);
  }

  connect() {
    // run once on load
    this.onScreenOrientationChangeEvent();

    // window.addEventListener('orientationchange', this.onScreenOrientationChangeEvent, false);
    window.addEventListener('deviceorientation', this.onDeviceOrientationChangeEvent, false);

    this.freeze = false;

    return this;
  }

  disconnect() {
    this.freeze = true;

    // window.removeEventListener('orientationchange', this.onScreenOrientationChangeEvent, false);
    window.removeEventListener('deviceorientation', this.onDeviceOrientationChangeEvent, false);
  }
}
