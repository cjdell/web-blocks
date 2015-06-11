/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import c from './Cube';
import part from './Partition';

module PartitionGeometry {
  export interface PartitionGeometry {
    dimensions: THREE.Vector3;
    consumeChanges(): void;
    getBufferGeometry(): THREE.BufferGeometry;
    getData(): any;
    getOffset(): THREE.Vector3;
  }
  
  export function NewPartitionGeometry(partition: part.Partition): PartitionGeometry {
    var FACE_PER_CUBE = 6;
    var VERTICES_PER_FACE = 6;
    var VERTICES_PER_CUBE = FACE_PER_CUBE * VERTICES_PER_FACE;
  
    var cubeCapacity = 0;
    var reserveCubes = 0;//100;
  
    var bufferGeometry = new THREE.BufferGeometry();
  
    var dimX = partition.dimensions.x, dimY = partition.dimensions.y, dimZ = partition.dimensions.z;
    var dimXY = (dimX * dimY);
  
    function ensureBufferSize(cubesNeeded: number): void {
      //if (cubesNeeded <= cubeCapacity) return;
  
      cubeCapacity = cubesNeeded + reserveCubes;
  
      var vertexCount = cubeCapacity * VERTICES_PER_CUBE;
  
      bufferGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
      bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
      bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2));
      bufferGeometry.addAttribute('data', new THREE.BufferAttribute(new Float32Array(vertexCount * 4), 4));
      bufferGeometry.addAttribute('offset', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
    }
  
    function consumeChanges(): void {
      var changes = partition.getVisibleBlocks();
  
      ensureBufferSize(changes.maxId + 1);
  
      if (changes.blocks.length === 0) return;
  
      var blocks = changes.blocks;
  
      for (var i = 0; i <= changes.maxId; i++) {
        var o = i * 6;
  
        var id = blocks[o + 0];
        var index = blocks[o + 1];
        var indexInWorld = blocks[o + 2];
        var type = blocks[o + 3];
        var shade = blocks[o + 4];
        var colour = blocks[o + 5];
  
        var position = getPositionFromIndex(index);
  
        var x = position.x, y = position.y, z = position.z;
  
        var cube = c.NewCube(bufferGeometry, id);
  
        cube.init();
  
        if (type !== 0) {
          cube.translate(x - dimX / 2, y - dimY / 2, z - dimZ / 2);
          cube.setOffset(indexInWorld);
          cube.setData(type, shade, colour);
        } else {
          cube.remove();
        }
      }
    }
  
    function getPositionFromIndex(index: number): THREE.Vector3 {
      var z = (index / dimXY) | 0;
      var y = ((index - z * dimXY) / dimX) | 0;
      var x = index - dimX * (y + dimY * z);
  
      return new THREE.Vector3(x, y, z);
    }
  
    function getBufferGeometry(): THREE.BufferGeometry {
      return bufferGeometry;
    }
  
    function getData(): any {
      var attrs = <any>bufferGeometry.attributes;
      
      return {
        position: attrs.position.array,
        normal: attrs.normal.array,
        uv: attrs.uv.array,
        data: attrs.data.array,
        offset: attrs.offset.array
      };
    }
  
    function getOffset(): THREE.Vector3 {
      return partition.offset;
    }
  
    function suspend(): void {
      console.log('Partition(' + partition.index + ').suspend');
    }
  
    return {
      dimensions: partition.dimensions,
      consumeChanges: consumeChanges,
      getBufferGeometry: getBufferGeometry,
      getData: getData,
      getOffset: getOffset,
      suspend: suspend
    };
  }
}

export default PartitionGeometry;
