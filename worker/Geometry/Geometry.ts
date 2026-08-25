import * as THREE from 'three';
import type { WorldInfo, IntVector3 } from '../../common/WorldInfo';
import type World from '../World';

export class Geometry {
  // Assigned in the constructor (strictPropertyInitialization).
  worldInfo!: WorldInfo;
  // The world the template block lives in: per-vertex light is sampled from
  // its sky light field.
  world: World;
  // Set by subclasses' init(); callers check before use.
  template: THREE.BufferGeometry | null = null;

  constructor(worldInfo: WorldInfo, world: World) {
    this.worldInfo = worldInfo;
    this.world = world;
  }

  init(): Promise<void> {
    throw new Error('Not implemented');
  }

  getVertexCount(): number {
    if (!this.template) return 0;

    // BufferAttribute exposes .count (vertices); it has no .length (that
    // would be .array.length, the component count).
    return (this.template.attributes as any).position.count;
  }

  generateGeometry(
    position: Float32Array,
    normal: Float32Array,
    uv: Float32Array,
    data: Float32Array,
    vertexOffsets: Uint32Array,
    offset: number,
    rindex: number,
    _type: number,
    _colour: number,
    partitionOffset: IntVector3,
    indexInWorld: number,
  ) {
    if (!this.template) return;

    const { x, y, z } = this.worldInfo.localPosition(rindex);

    const attributes = this.template.attributes as any;

    const vertexCount = attributes.position.count;

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

    // Template geometry (fence) has no per-vertex face data: the fence is
    // opaque to light, so sample the sky light of the cell above the block
    // (in world coordinates) and use a mid directional brightness.
    const light =
      (this.world.getLightAt(
        x + partitionOffset.x,
        y + 1 + partitionOffset.y,
        z + partitionOffset.z,
      ) /
        15) *
      0.9;

    for (let i = 0; i < vertexCount; i += 1) {
      const p1 = (offset + i) * 4;

      data[p1 + 0] = 1;
      data[p1 + 2] = light;

      // Every vertex (template or not) carries its block's world index in
      // the per-vertex offset attribute.
      vertexOffsets[offset + i] = indexInWorld;
    }
  }
}
