/// <reference path="../../typings/index.d.ts" />
import THREE = require('three');
import com from '../../common/WorldInfo';

export class Geometry {
  worldInfo: com.WorldInfo = null;
  template: THREE.BufferGeometry = null;

  constructor(worldInfo: com.WorldInfo) {
    this.worldInfo = worldInfo;
  }

  init(): Promise<void> {
    throw new Error('Not implemented');
  }

  getVertexCount(): number {
    if (!this.template) return 0;

    return (<any>this.template.attributes).position.length / 3;
  }

  generateGeometry(position: Float32Array, normal: Float32Array, uv: Float32Array, data: Float32Array, offset: number, rindex: number, type: number, colour: number) {
    if (!this.template) return;

    const { x, y, z } = this.worldInfo.rpos(rindex);

    const attributes = (<any>this.template.attributes);

    const vertexCount = attributes.position.length / 3;

    for (let i = 0; i < vertexCount; i += 1) {
      const p1 = (offset + i) * 3;
      const p2 = i * 3;

      position[p1 + 0] = attributes.position.array[p2 + 0] + x;
      position[p1 + 1] = attributes.position.array[p2 + 1] + y;
      position[p1 + 2] = attributes.position.array[p2 + 2] + z;

      normal[p1 + 0] = attributes.normal.array[p2 + 0];
      normal[p1 + 1] = attributes.normal.array[p2 + 1];
      normal[p1 + 2] = attributes.normal.array[p2 + 2];
    }

    if (attributes.uv) {
      for (let i = 0; i < vertexCount; i += 1) {
        const p1 = (offset + i) * 2;
        const p2 = i * 2;

        uv[p1 + 0] = attributes.uv.array[p2 + 0];
        uv[p1 + 1] = attributes.uv.array[p2 + 1];
      }
    }

    for (let i = 0; i < vertexCount; i += 1) {
      const p1 = (offset + i) * 4;
      const p2 = i * 4;

      data[p1 + 0] = 1;
    }
  }
}
