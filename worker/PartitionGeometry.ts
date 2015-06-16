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
    let FACE_PER_CUBE = 6;
    let VERTICES_PER_FACE = 6;
    let VERTICES_PER_CUBE = FACE_PER_CUBE * VERTICES_PER_FACE;

    let cubeCapacity = 0;
    let reserveCubes = 0;//100;

    let bufferGeometry = new THREE.BufferGeometry();

    let dimX = partition.dimensions.x, dimY = partition.dimensions.y, dimZ = partition.dimensions.z;
    let dimXY = (dimX * dimY);

    function ensureBufferSize(cubesNeeded: number): void {
      //if (cubesNeeded <= cubeCapacity) return;

      cubeCapacity = cubesNeeded + reserveCubes;

      let vertexCount = cubeCapacity * VERTICES_PER_CUBE;

      bufferGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
      bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
      bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2));
      bufferGeometry.addAttribute('data', new THREE.BufferAttribute(new Float32Array(vertexCount * 4), 4));
      bufferGeometry.addAttribute('offset', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
    }

    function consumeChanges(): void {
      let changes = partition.getVisibleBlocks();

      ensureBufferSize(changes.maxId + 1);

      if (changes.blocks.length === 0) return;

      let blocks = changes.blocks;

      for (let i = 0; i <= changes.maxId; i++) {
        let o = i * 6;

        let id = blocks[o + 0];
        let index = blocks[o + 1];
        let indexInWorld = blocks[o + 2];
        let type = blocks[o + 3];
        let shade = blocks[o + 4];
        let colour = blocks[o + 5];

        let position = getPositionFromIndex(index);

        let x = position.x, y = position.y, z = position.z;

        let cube = c.NewCube(bufferGeometry, id);

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
      let z = (index / dimXY) | 0;
      let y = ((index - z * dimXY) / dimX) | 0;
      let x = index - dimX * (y + dimY * z);

      return new THREE.Vector3(x, y, z);
    }

    function getBufferGeometry(): THREE.BufferGeometry {
      return bufferGeometry;
    }

    function getData(): any {
      let attrs = <any>bufferGeometry.attributes;

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
