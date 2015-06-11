/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

var positionTemplate = new Float32Array([0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5]);
var normalTemplate = new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
var uvTemplate = new Float32Array([0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1]);

module Cube {
  export interface Cube {
    init(): void;
    remove(): void;
    translate(x: number, y: number, z: number): void;
    setOffset(index: number): void;
    setData(type: number, shade: number, colour: number): void;
  }

  export function NewCube(bufferGeometry: any, cubeIndex: number): Cube {
    var FACE_PER_CUBE = 6;
    var VERTICES_PER_FACE = 6;
    var VERTICES_PER_CUBE = FACE_PER_CUBE * VERTICES_PER_FACE;
  
    var POSITION_VALUES_PER_VERTEX = 3;
    var DATA_VALUES_PER_VERTEX = 4;
  
    var vertexOffset = cubeIndex * VERTICES_PER_CUBE;
  
    var positionOffset = vertexOffset * POSITION_VALUES_PER_VERTEX;
    var uvOffset = vertexOffset * 2;
    var dataOffset = vertexOffset * DATA_VALUES_PER_VERTEX;
  
    function init(): void {
      var i = 0, p = 0;
  
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
      for (var i = positionOffset; i < positionOffset + VERTICES_PER_CUBE * POSITION_VALUES_PER_VERTEX; i += POSITION_VALUES_PER_VERTEX) {
        bufferGeometry.attributes.position.array[i + 0] = 0;
        bufferGeometry.attributes.position.array[i + 1] = 0;
        bufferGeometry.attributes.position.array[i + 2] = 0;
      }
    }
  
    function translate(x: number, y: number, z: number): void {
      for (var i = positionOffset; i < positionOffset + VERTICES_PER_CUBE * POSITION_VALUES_PER_VERTEX; i += POSITION_VALUES_PER_VERTEX) {
        bufferGeometry.attributes.position.array[i + 0] += x + 0.5;
        bufferGeometry.attributes.position.array[i + 1] += y + 0.5;
        bufferGeometry.attributes.position.array[i + 2] += z + 0.5;
      }
    }
  
    function setOffset(index: number): void {
      for (var i = vertexOffset; i < vertexOffset + VERTICES_PER_CUBE; i += 1) {
        bufferGeometry.attributes.offset.array[i] = index;
      }
    }
  
    function setData(type: number, shade: number, colour: number): void {
      for (var i = dataOffset, v = 0; i < dataOffset + VERTICES_PER_CUBE * DATA_VALUES_PER_VERTEX; i += DATA_VALUES_PER_VERTEX, v++) {
        var plane = (v / VERTICES_PER_FACE) | 0;
        var side = plane % 6;
  
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
