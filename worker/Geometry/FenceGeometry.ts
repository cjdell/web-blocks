"use strict";
/// <reference path="../../typings/index.d.ts" />
import THREE = require('three');
import fs = require('fs');

import com from '../../common/WorldInfo';
import { Geometry } from './Geometry';

export class FenceGeometry extends Geometry {
  constructor(worldInfo: com.WorldInfo) {
    super(worldInfo);
  }

  init(): Promise<void> {
    const geometry = new THREE.Geometry();
    const cube = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const mat = new THREE.Matrix4();

    mat.scale(new THREE.Vector3(1.0, 0.1, 0.1));
    mat.setPosition(new THREE.Vector3(0.5, 0.5, 0.5));
    geometry.merge(cube, mat, 0);

    mat.identity();

    mat.scale(new THREE.Vector3(0.1, 0.5, 0.1));
    mat.setPosition(new THREE.Vector3(0.05 + (1 / 5), 0.25, 0.5));
    geometry.merge(cube, mat, 0);

    mat.identity();

    mat.scale(new THREE.Vector3(0.1, 0.5, 0.1));
    mat.setPosition(new THREE.Vector3(0.95 - (1 / 5), 0.25, 0.5));
    geometry.merge(cube, mat, 0);

    this.template = new THREE.BufferGeometry();
    this.template.fromGeometry(geometry);

    return Promise.resolve(null);

    // return new Promise<void>((resolve, reject) => {
    //   var loader = new THREE.JSONLoader();
    //
    //   // var buf = fs.readFileSync('./models/box.json');
    //   // var prefix = "data:application/json;base64,";
    //   // var url = prefix + buf.toString('base64');
    //
    //   const url = '../models/Ted.json';
    //
    //   loader.load(url, (geometry, materials) => {
    //     const mat = new THREE.Matrix4();
    //     mat.setPosition(new THREE.Vector3(0.5, 0.5, 0.5));
    //     mat.scale(new THREE.Vector3(0.5, 0.5, 0.5));
    //
    //     const geo = new THREE.Geometry();
    //     geo.merge(geometry, mat, 0);
    //
    //     this.fenceTemplate = new THREE.BufferGeometry();
    //     this.fenceTemplate.fromGeometry(geo);
    //
    //     return resolve();
    //   });
    // });
  }
}
