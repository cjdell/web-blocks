import type { WorldInfo, IntVector3 } from '../common/WorldInfo';
import type { VertexData } from '../common/WorkerProtocol';
import constants from '../common/Constants';
import Partition from './Partition';
import World from './World';
import { Loader } from './Geometry/Loader';

const VERTICES_PER_FACE = 6;
const VALUES_PER_VBLOCK = 8;
const MAX_LIGHT = 15;

// The six sides: the face plane (axis + local value), and the two in-plane
// local axes. (Matches FACES/NORMALS: side 0 is the x=0 face with normal
// -x, and so on.)
interface SideDef {
  planeAxis: number;
  planeValue: number;
  axis1: number;
  axis2: number;
}

const SIDE_DEFS: SideDef[] = [
  { planeAxis: 0, planeValue: 0, axis1: 1, axis2: 2 }, // x=0, normal -x
  { planeAxis: 0, planeValue: 1, axis1: 1, axis2: 2 }, // x=1, normal +x
  { planeAxis: 1, planeValue: 0, axis1: 0, axis2: 2 }, // y=0, normal -y
  { planeAxis: 1, planeValue: 1, axis1: 0, axis2: 2 }, // y=1, normal +y
  { planeAxis: 2, planeValue: 0, axis1: 0, axis2: 1 }, // z=0, normal -z
  { planeAxis: 2, planeValue: 1, axis1: 0, axis2: 1 }, // z=1, normal +z
];

// Minecraft-style directional face brightness.
const FACE_BRIGHTNESS = [0.8, 0.8, 0.5, 1.0, 0.6, 0.6];

// Bit for a neighbour offset (dx, dy, dz) in the 27-bit surrounding/AO
// masks (see World.getSurroundingBlocks / getOcclusionMask).
function bitFor(dx: number, dy: number, dz: number): number {
  return (dz + 1) * 9 + (dy + 1) * 3 + (dx + 1);
}

// Per side, per corner (index a + 2b for in-plane coords (a, b) in {0,1}²):
// the three AO mask bits (side1, side2, corner) around the face vertex in
// the outer plane of the face.
function aoBitsForSide(def: SideDef): number[][] {
  const bits: number[][] = [];

  for (let corner = 0; corner < 4; corner++) {
    const a = corner & 1;
    const b = corner >> 1;

    const plane = def.planeValue === 0 ? -1 : 1;
    const o1 = a === 0 ? -1 : 1;
    const o2 = b === 0 ? -1 : 1;

    const s1 = [0, 0, 0];
    s1[def.planeAxis] = plane;
    s1[def.axis1] = o1;

    const s2 = [0, 0, 0];
    s2[def.planeAxis] = plane;
    s2[def.axis2] = o2;

    const c = [0, 0, 0];
    c[def.planeAxis] = plane;
    c[def.axis1] = o1;
    c[def.axis2] = o2;

    bits.push([bitFor(s1[0], s1[1], s1[2]), bitFor(s2[0], s2[1], s2[2]), bitFor(c[0], c[1], c[2])]);
  }

  return bits;
}

// Per side, per corner: the offset of the outside cell (the air cell the
// face points into) whose light the face vertex samples, relative to the
// block's own cell (the face's plane is the block's edge on the normal axis,
// so the outside cell is exactly ±1 on that axis).
function lightOffsetsForSide(def: SideDef): number[][] {
  const offsets: number[][] = [];

  for (let corner = 0; corner < 4; corner++) {
    const a = corner & 1;
    const b = corner >> 1;

    const o = [0, 0, 0];
    o[def.planeAxis] = def.planeValue === 0 ? -1 : 1;
    o[def.axis1] = a;
    o[def.axis2] = b;

    offsets.push(o);
  }

  return offsets;
}

const AO_BITS = SIDE_DEFS.map(aoBitsForSide);
const LIGHT_OFFSETS = SIDE_DEFS.map(lightOffsetsForSide);

// For each side, the corner index (a + 2b in in-plane coords) of each of the
// six FACES vertices (two triangles sharing the four face corners). Derived
// from FACES below so it cannot drift out of sync with the vertex order.
// (Declared here, filled in below where FACES is in scope.)
const AO_VERTEX_CORNER: number[][] = [];

// Reused across getTriangle calls (the worker is single-threaded).
const aoLevelScratch = [0, 0, 0, 0];
const lightLevelScratch = [0, 0, 0, 0];

const FACES = [
  new Float32Array([0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1]), // Right
  new Float32Array([0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0]), // Left
  new Float32Array([1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1]), // Bottom
  new Float32Array([1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0]), // Top
  new Float32Array([1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0]), // Front
  new Float32Array([0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), // Back
];

// Fill AO_VERTEX_CORNER from the face data: each vertex's corner is its
// in-plane coordinates (a on axis1, b on axis2), index a + 2b.
FACES.forEach((face, side) => {
  const def = SIDE_DEFS[side];
  const corners = new Array<number>(6);

  for (let i = 0; i < 6; i++) {
    const a = face[i * 3 + def.axis1] | 0;
    const b = face[i * 3 + def.axis2] | 0;

    corners[i] = a + 2 * b;
  }

  AO_VERTEX_CORNER[side] = corners;
});

// The shift from a block's position to its face's plane: 0 on the min-edge
// faces, 1 on the max-edge faces (along the normal axis only).
const FACE_SHIFT = SIDE_DEFS.map((def) => {
  const shift = [0, 0, 0];
  shift[def.planeAxis] = def.planeValue;
  return shift;
});

const UV = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0]);

const NORMALS = new Float32Array([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1]);

export default class PartitionGeometry {
  worldInfo: WorldInfo;
  partition: Partition;
  world: World;

  position!: Float32Array;
  normal!: Float32Array;
  uv!: Float32Array;
  data!: Float32Array;
  offset!: Uint32Array;

  dimX!: number;
  dimY!: number;
  dimZ!: number;
  dimXY!: number;

  constructor(worldInfo: WorldInfo, partition: Partition, world: World) {
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
    // Per-vertex light samples the partition's one-cell halo, so make sure
    // the light there is computed and settled before any vertex is written.
    this.world.ensureLightAround(this.partition);

    const blocks = this.world.getVisibleBlocks(this.partition.index);

    let faceCount = 0,
      otherVertices = 0;

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

      faceCount +=
        (xd ? 1 : 0) + (xu ? 1 : 0) + (yd ? 1 : 0) + (yu ? 1 : 0) + (zd ? 1 : 0) + (zu ? 1 : 0);
    }

    this.ensureBufferSize(faceCount * VERTICES_PER_FACE + otherVertices);

    let v = 0;

    for (let i = 0; i < blocks.length / VALUES_PER_VBLOCK; i++) {
      const o = i * VALUES_PER_VBLOCK;

      const index = blocks[o + 1];
      const indexInWorld = blocks[o + 2];
      const type = blocks[o + 3];
      const touchingBlocks = blocks[o + 4];
      const colour = blocks[o + 5];
      const aoMask = blocks[o + 6];

      const { x, y, z } = this.worldInfo.localPosition(index);

      if (Loader.Instance.getTypes().indexOf(type) !== -1) {
        const geometry = Loader.Instance.getGeometry(type);

        geometry.generateGeometry(
          this.position,
          this.normal,
          this.uv,
          this.data,
          this.offset,
          v,
          index,
          type,
          colour,
          this.partition.offset,
          indexInWorld,
        );

        v += geometry.getVertexCount();

        continue;
      }

      const xd = !(touchingBlocks & (1 << 12));
      const xu = !(touchingBlocks & (1 << 14));

      const yd = !(touchingBlocks & (1 << 10));
      const yu = !(touchingBlocks & (1 << 16));

      const zd = !(touchingBlocks & (1 << 4));
      const zu = !(touchingBlocks & (1 << 22));

      // (x, y, z) is the block's position; getTriangle derives the face
      // plane (and the outside-cell light samples) from it.
      if (xd) {
        this.getTriangle(v, x, y, z, type, 0, colour, aoMask, indexInWorld);
        v += 6;
      }

      if (xu) {
        this.getTriangle(v, x, y, z, type, 1, colour, aoMask, indexInWorld);
        v += 6;
      }

      if (yd) {
        this.getTriangle(v, x, y, z, type, 2, colour, aoMask, indexInWorld);
        v += 6;
      }

      if (yu) {
        this.getTriangle(v, x, y, z, type, 3, colour, aoMask, indexInWorld);
        v += 6;
      }

      if (zd) {
        this.getTriangle(v, x, y, z, type, 4, colour, aoMask, indexInWorld);
        v += 6;
      }

      if (zu) {
        this.getTriangle(v, x, y, z, type, 5, colour, aoMask, indexInWorld);
        v += 6;
      }
    }
  }

  getTriangle(
    v: number,
    x: number,
    y: number,
    z: number,
    type: number,
    side: number,
    colour: number,
    aoMask: number,
    indexInWorld: number,
  ) {
    // (x, y, z) is the block's position in partition-local coordinates. The
    // four unique corners of the face get the Minecraft AO level (from the
    // two side neighbours and the diagonal in the face's outer plane) and
    // the sky light of the outside cell at the corner — a world position,
    // since the light field lives in world space while this geometry is
    // partition-local (the mesh is translated by the partition offset).
    const aoBits = AO_BITS[side];
    const lightOffsets = LIGHT_OFFSETS[side];
    const shift = FACE_SHIFT[side];
    const off = this.partition.offset;

    for (let corner = 0; corner < 4; corner++) {
      const side1 = (aoMask >> aoBits[corner][0]) & 1;
      const side2 = (aoMask >> aoBits[corner][1]) & 1;

      // Two adjacent occluders kill the corner; otherwise each occluder
      // removes a level (the corner block refines the smooth gradient).
      aoLevelScratch[corner] = side1 && side2 ? 0 : 3 - side1 - side2;

      const o = lightOffsets[corner];
      lightLevelScratch[corner] = this.world.getLightAt(
        x + off.x + o[0],
        y + off.y + o[1],
        z + off.z + o[2],
      );
    }

    const vertexCorners = AO_VERTEX_CORNER[side];
    const brightness = FACE_BRIGHTNESS[side];

    for (let i = 0; i < 6; i += 1) {
      this.position[(v + i) * 3 + 0] = FACES[side][i * 3 + 0] + x + shift[0];
      this.position[(v + i) * 3 + 1] = FACES[side][i * 3 + 1] + y + shift[1];
      this.position[(v + i) * 3 + 2] = FACES[side][i * 3 + 2] + z + shift[2];

      this.normal[(v + i) * 3 + 0] = -NORMALS[side * 3 + 0];
      this.normal[(v + i) * 3 + 1] = -NORMALS[side * 3 + 1];
      this.normal[(v + i) * 3 + 2] = -NORMALS[side * 3 + 2];

      this.uv[(v + i) * 2 + 0] = UV[i * 2 + 0];
      this.uv[(v + i) * 2 + 1] = UV[i * 2 + 1];

      const corner = vertexCorners[i];

      // Per-vertex light 0..1: sky light, the directional face brightness,
      // and the AO factor — interpolated across the face in the shader.
      const light =
        (lightLevelScratch[corner] / MAX_LIGHT) * brightness * ((aoLevelScratch[corner] + 1) / 4);

      this.data[(v + i) * 4 + constants.VERTEX_DATA_TYPE] = type;
      this.data[(v + i) * 4 + constants.VERTEX_DATA_SIDE] = side;
      this.data[(v + i) * 4 + constants.VERTEX_DATA_LIGHT] = light;
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
      offset: this.offset,
    };
  }

  getOffset(): IntVector3 {
    return this.partition.offset;
  }

  suspend(): void {
    console.log('Partition(' + this.partition.index + ').suspend');
  }
}
