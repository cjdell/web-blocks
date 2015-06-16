/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

let positionTemplate = new Float32Array([0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5]);
let normalTemplate = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
let uvTemplate = new Float32Array([0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1]);

module Cube {
  export interface Cube {
    init(): void;
    remove(): void;
    translate(x: number, y: number, z: number): void;
    setOffset(index: number): void;
    setData(type: number, shade: number, colour: number): void;
  }

  export function NewCube(bufferGeometry: any, cubeIndex: number): Cube {
    let FACE_PER_CUBE = 6;
    let VERTICES_PER_FACE = 6;
    let VERTICES_PER_CUBE = FACE_PER_CUBE * VERTICES_PER_FACE;

    let POSITION_VALUES_PER_VERTEX = 3;
    let DATA_VALUES_PER_VERTEX = 4;

    let vertexOffset = cubeIndex * VERTICES_PER_CUBE;

    let positionOffset = vertexOffset * POSITION_VALUES_PER_VERTEX;
    let uvOffset = vertexOffset * 2;
    let dataOffset = vertexOffset * DATA_VALUES_PER_VERTEX;

    function init(): void {
      let i = 0, p = 0;

      for (i = positionOffset, p = 0; i < positionOffset + VERTICES_PER_CUBE * POSITION_VALUES_PER_VERTEX; i++, p++) {
        bufferGeometry.attributes.position.array[i] = positionTemplate[p];
      }

      for (i = positionOffset, p = 0; i < positionOffset + VERTICES_PER_CUBE * POSITION_VALUES_PER_VERTEX; i++, p++) {
        bufferGeometry.attributes.normal.array[i] = normalTemplate[p];
      }

      for (i = uvOffset, p = 0; i < uvOffset + VERTICES_PER_CUBE * 2; i++, p++) {
        bufferGeometry.attributes.uv.array[i] = uvTemplate[p];
      }
    }

    function remove(): void {
      for (let i = positionOffset; i < positionOffset + VERTICES_PER_CUBE * POSITION_VALUES_PER_VERTEX; i += POSITION_VALUES_PER_VERTEX) {
        bufferGeometry.attributes.position.array[i + 0] = 0;
        bufferGeometry.attributes.position.array[i + 1] = 0;
        bufferGeometry.attributes.position.array[i + 2] = 0;
      }
    }

    function translate(x: number, y: number, z: number): void {
      for (let i = positionOffset; i < positionOffset + VERTICES_PER_CUBE * POSITION_VALUES_PER_VERTEX; i += POSITION_VALUES_PER_VERTEX) {
        bufferGeometry.attributes.position.array[i + 0] += x + 0.5;
        bufferGeometry.attributes.position.array[i + 1] += y + 0.5;
        bufferGeometry.attributes.position.array[i + 2] += z + 0.5;
      }
    }

    function setOffset(index: number): void {
      for (let i = vertexOffset; i < vertexOffset + VERTICES_PER_CUBE; i += 1) {
        bufferGeometry.attributes.offset.array[i] = index;
      }
    }

    function setData(type: number, shade: number, colour: number): void {
      for (let i = dataOffset, v = 0; i < dataOffset + VERTICES_PER_CUBE * DATA_VALUES_PER_VERTEX; i += DATA_VALUES_PER_VERTEX, v++) {
        let plane = (v / VERTICES_PER_FACE) | 0;
        let side = plane % 6;

        bufferGeometry.attributes.data.array[i + 0] = type;
        bufferGeometry.attributes.data.array[i + 1] = side;
        bufferGeometry.attributes.data.array[i + 2] = shade;
        bufferGeometry.attributes.data.array[i + 3] = colour;
      }
    }

    return {
      init: init,
      remove: remove,
      translate: translate,
      setOffset: setOffset,
      setData: setData
    };
  }
}

export default Cube;
