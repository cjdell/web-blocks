"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../common/WorldInfo';
import constants from '../common/Constants';
import Partition from './Partition';
import World from './World';

import { Geometry } from './Geometry/Geometry';
import { FenceGeometry } from './Geometry/FenceGeometry';
import { Loader } from './Geometry/Loader';

const FACE_PER_CUBE = 6;
const VERTICES_PER_FACE = 6;
const VERTICES_PER_CUBE = FACE_PER_CUBE * VERTICES_PER_FACE;

const VALUES_PER_VBLOCK = 7;

const FACES = [
  new Float32Array([0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1]),   // Right
  new Float32Array([0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0]),   // Left
  new Float32Array([1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1]),   // Bottom
  new Float32Array([1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0]),   // Top
  new Float32Array([1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0]),   // Front
  new Float32Array([0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])    // Back
];

const UV = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0]);

const NORMALS = new Float32Array([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1]);

export interface VertexData {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  data: Float32Array;
  offset: Float32Array;
}

export default class PartitionGeometry {
  worldInfo: com.WorldInfo;
  partition: Partition;
  world: World;

  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  data: Float32Array;
  offset: Float32Array;

  dimX: number;
  dimY: number;
  dimZ: number;
  dimXY: number;

  constructor(worldInfo: com.WorldInfo, partition: Partition, world: World) {
    this.worldInfo = worldInfo;
    this.partition = partition;
    this.world = world;
  }

  ensureBufferSize(vertexCount: number): void {
    this.position = new Float32Array(vertexCount * 3);
    this.normal = new Float32Array(vertexCount * 3);
    this.uv = new Float32Array(vertexCount * 2);
    this.data = new Float32Array(vertexCount * 4);
    this.offset = new Uint32Array(vertexCount);
  }

  generateGeometry(): void {
    const blocks = this.world.getVisibleBlocks(this.partition.index);

    if (blocks.length === 0) return;

    let faceCount = 0, otherVertices = 0;

    // Count the faces
    for (let i = 0; i < blocks.length / VALUES_PER_VBLOCK; i++) {
      const o = i * VALUES_PER_VBLOCK;

      const type = blocks[o + 3];
      const touchingBlocks = blocks[o + 4];

      if (Loader.Instance.getTypes().indexOf(type) !== -1) {
        const geometry = Loader.Instance.getGeometry(type);

        otherVertices += geometry.getVertexCount();

        continue;
      }

      const xd = !(touchingBlocks & (1 << 12));
      const xu = !(touchingBlocks & (1 << 14));

      const yd = !(touchingBlocks & (1 << 10));
      const yu = !(touchingBlocks & (1 << 16));

      const zd = !(touchingBlocks & (1 << 4));
      const zu = !(touchingBlocks & (1 << 22));

      faceCount += (xd ? 1 : 0) + (xu ? 1 : 0) + (yd ? 1 : 0) + (yu ? 1 : 0) + (zd ? 1 : 0) + (zu ? 1 : 0);
    }

    this.ensureBufferSize(faceCount * VERTICES_PER_FACE + otherVertices);

    let v = 0;

    for (let i = 0; i < blocks.length / VALUES_PER_VBLOCK; i++) {
      const o = i * VALUES_PER_VBLOCK;

      //const id = blocks[o + 0];
      const index = blocks[o + 1];
      const indexInWorld = blocks[o + 2];
      const type = blocks[o + 3];
      const touchingBlocks = blocks[o + 4];
      const colour = blocks[o + 5];
      const shade = blocks[o + 6];

      const { x, y, z } = this.worldInfo.rpos(index);

      if (Loader.Instance.getTypes().indexOf(type) !== -1) {
        const geometry = Loader.Instance.getGeometry(type);

        geometry.generateGeometry(this.position, this.normal, this.uv, this.data, v, index, type, colour);

        v += geometry.getVertexCount();

        continue;
      }

      const xd = !(touchingBlocks & (1 << 12));
      const xu = !(touchingBlocks & (1 << 14));

      const yd = !(touchingBlocks & (1 << 10));
      const yu = !(touchingBlocks & (1 << 16));

      const zd = !(touchingBlocks & (1 << 4));
      const zu = !(touchingBlocks & (1 << 22));

      if (xd) {
        this.getTriangle(v, x, y, z, type, 0, colour, shade, indexInWorld);
        v += 6;
      }

      if (xu) {
        this.getTriangle(v, x + 1, y, z, type, 1, colour, shade, indexInWorld);
        v += 6;
      }

      if (yd) {
        this.getTriangle(v, x, y, z, type, 2, colour, shade, indexInWorld);
        v += 6;
      }

      if (yu) {
        this.getTriangle(v, x, y + 1, z, type, 3, colour, shade, indexInWorld);
        v += 6;
      }

      if (zd) {
        this.getTriangle(v, x, y, z, type, 4, colour, shade, indexInWorld);
        v += 6;
      }

      if (zu) {
        this.getTriangle(v, x, y, z + 1, type, 5, colour, shade, indexInWorld);
        v += 6;
      }
    }
  }

  getTriangle(v: number, x: number, y: number, z: number, type: number, side: number, colour: number, shade: number, indexInWorld: number) {
    for (let i = 0; i < 6; i += 1) {
      this.position[(v + i) * 3 + 0] = FACES[side][i * 3 + 0] + x;
      this.position[(v + i) * 3 + 1] = FACES[side][i * 3 + 1] + y;
      this.position[(v + i) * 3 + 2] = FACES[side][i * 3 + 2] + z;

      this.normal[(v + i) * 3 + 0] = -NORMALS[side * 3 + 0];
      this.normal[(v + i) * 3 + 1] = -NORMALS[side * 3 + 1];
      this.normal[(v + i) * 3 + 2] = -NORMALS[side * 3 + 2];

      this.uv[(v + i) * 2 + 0] = UV[i * 2 + 0];
      this.uv[(v + i) * 2 + 1] = UV[i * 2 + 1];

      this.data[(v + i) * 4 + constants.VERTEX_DATA_TYPE] = type;
      this.data[(v + i) * 4 + constants.VERTEX_DATA_SIDE] = side;
      this.data[(v + i) * 4 + constants.VERTEX_DATA_SHADE] = shade;
      this.data[(v + i) * 4 + constants.VERTEX_DATA_COLOUR] = colour;

      this.offset[v + i] = indexInWorld;
    }
  }

  getData(): VertexData {
    return {
      position: this.position,
      normal: this.normal,
      uv: this.uv,
      data: this.data,
      offset: this.offset
    };
  }

  getOffset(): com.IntVector3 {
    return this.partition.offset;
  }

  suspend(): void {
    console.log('Partition(' + this.partition.index + ').suspend');
  }
}
