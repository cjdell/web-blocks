"use strict";
/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';
import { Geometry } from './Geometry';
import { FenceGeometry } from './FenceGeometry';

export class Loader {
  static Instance: Loader;

  worldInfo: com.WorldInfo;

  geometries: { [index: number]: Geometry } = {};

  constructor(worldInfo: com.WorldInfo) {
    this.worldInfo = worldInfo;

    this.geometries[6] = new FenceGeometry(this.worldInfo);
  }

  init(): Promise<void> {
    return this.geometries[6].init();
  }

  getTypes(): number[] {
    return Object.keys(this.geometries).map(t => parseInt(t));
  }

  getGeometry(type: number): Geometry {
    const geometry = this.geometries[type];

    // if (!geometry) throw new Error('Invalid type');

    return geometry;
  }
}
