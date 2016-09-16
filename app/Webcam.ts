"use strict";
/// <reference path="../typings/index.d.ts" />
import THREE = require('three');

export default class Webcam {
  video: HTMLVideoElement;
  videoImageContext: CanvasRenderingContext2D;
  videoTexture: THREE.Texture;
  videoImage: HTMLCanvasElement;
  inited = false;

  constructor() {
    this.videoImage = document.createElement('canvas');
    this.videoTexture = new THREE.Texture(this.videoImage);
  }

  init() {
    const nav = <any>navigator;
    const win = <any>window;

    let getUserMedia = <any>(nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia);
    const URL = <any>(win.URL || win.webkitURL);

    getUserMedia = getUserMedia.bind(navigator);

    const camvideo = document.createElement('video');

    camvideo.autoplay = true;
    camvideo.width = 640;
    camvideo.height = 480;

    if (!getUserMedia) {
      alert('Sorry. <code>navigator.getUserMedia()</code> is not available.');
    } else {
      getUserMedia({ video: true }, gotStream.bind(this), noStream);
    }

    function gotStream(stream: any) {
      console.log('gotStream');

      if (URL) {
        camvideo.src = URL.createObjectURL(stream);
      } else {
        camvideo.src = stream;
      }

      camvideo.onerror = function (e) {
        console.error('camvideo.onerror', e);

        stream.stop();
      };

      stream.onended = noStream;

      this.inited = true;
    }

    function noStream(e: any) {
      console.error('noStream', e);

      let msg = 'No camera available.';

      if (e.code === 1) {
        msg = 'User denied access to use camera.';
      }

      alert(msg);
    }

    this.video = camvideo;

    this.videoImage.width = 640;
    this.videoImage.height = 480;

    this.videoImageContext = <CanvasRenderingContext2D>this.videoImage.getContext('2d');

    // background color if no video present
    this.videoImageContext.fillStyle = '#0000ff';
    this.videoImageContext.fillRect(0, 0, this.videoImage.width, this.videoImage.height);

    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;

    const movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, overdraw: 1, side: THREE.DoubleSide });

    // the geometry on which the movie will be displayed;
    // 		movie image will be scaled to fit these dimensions.
    const movieGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);

    const movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);

    movieScreen.position.set(100, 10, 100);
  }

  render() {
    if (this.inited && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.videoImageContext.drawImage(this.video, 0, 0, this.videoImage.width, this.videoImage.height);

      if (this.videoTexture) this.videoTexture.needsUpdate = true;
    }
  }

  getTexture() {
    return this.videoTexture;
  }
}
