import * as THREE from 'three';
import type { WorldInfo } from '../../common/WorldInfo';
export class Geometry {
  // Assigned in the constructor (strictPropertyInitialization).
  worldInfo!: WorldInfo;
  // Set by subclasses' init(); callers check before use.
  template: THREE.BufferGeometry | null = null;

  constructor(worldInfo: WorldInfo) {
    this.worldInfo = worldInfo;
  }

  init(): Promise<void> {
    throw new Error('Not implemented');
  }

  getVertexCount(): number {
    if (!this.template) return 0;

    return (this.template.attributes as any).position.length / 3;
  }

  generateGeometry(position: Float32Array, normal: Float32Array, uv: Float32Array, data: Float32Array, offset: number, rindex: number, _type: number, _colour: number) {
    if (!this.template) return;

    const { x, y, z } = this.worldInfo.rpos(rindex);

    const attributes = this.template.attributes as any;

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

      data[p1 + 0] = 1;
    }
  }
}
