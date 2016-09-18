"use strict";
/// <reference path="../../typings/index.d.ts" />
import com from '../../common/WorldInfo';
import { BlockTypeIds } from '../../common/BlockTypeList';
import { Geometry } from './Geometry';
import { FenceGeometry } from './FenceGeometry';

export class Loader {
  static Instance: Loader;

  worldInfo: com.WorldInfo;

  geometries: { [index: number]: Geometry } = {};

  constructor(worldInfo: com.WorldInfo) {
    this.worldInfo = worldInfo;

    this.geometries[BlockTypeIds.Fence] = new FenceGeometry(this.worldInfo);
  }

  init(): Promise<void> {
    return this.geometries[BlockTypeIds.Fence].init();
  }

  getTypes(): number[] {
    return Object.keys(this.geometries).map(t => parseInt(t, 10));
  }

  getGeometry(type: number): Geometry {
    const geometry = this.geometries[type];

    // if (!geometry) throw new Error('Invalid type');

    return geometry;
  }
}
