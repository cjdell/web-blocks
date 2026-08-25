import { describe, expect, it } from 'vitest';
import { IntVector3, WorldInfo } from '../common/WorldInfo';
import { BlockTypeIds } from '../common/BlockTypeList';
import constants from '../common/Constants';
import World from '../worker/World';
import WorldGeometry from '../worker/WorldGeometry';
import type { PartitionGeometryData } from '../common/WorkerProtocol';
import { Loader } from '../worker/Geometry/Loader';

/**
 * A 1×1×1 world of 8×8×8 blocks: the whole world is one partition, so
 * every cell is addressable directly. The default landscape (noise terrain
 * filling the partition) is cleared so tests start from air.
 */
function makeWorld(): World {
  const worldInfo = new WorldInfo({
    worldDimensionsInPartitions: new IntVector3(1, 1, 1),
    partitionDimensionsInBlocks: new IntVector3(8, 8, 8),
    partitionBoundaries: null,
  });

  const world = new World(worldInfo);
  world.init();

  world.setBlocks(0, 0, 0, 7, 7, 7, BlockTypeIds.Air, 0);

  return world;
}

describe('Light (sky light engine)', () => {
  it('computes full sky light in an open column', () => {
    const world = makeWorld();

    expect(world.getLightAt(3, 7, 3)).toBe(15); // top row
    expect(world.getLightAt(3, 0, 3)).toBe(15); // straight down is free
  });

  it('lights only through open columns (opaque blocks block light)', () => {
    const world = makeWorld();

    // A slab at y=2: the air under it is no longer in an open column.
    world.setBlocks(2, 2, 2, 3, 2, 2, BlockTypeIds.Stone, 0);

    expect(world.getLightAt(2, 3, 2)).toBe(15); // above the slab
    expect(world.getLightAt(2, 1, 2)).toBe(14); // under the slab: 1 step from open air
    expect(world.getLightAt(2, 0, 2)).toBe(14); // straight down stays 14
  });

  it('keeps a fully enclosed space dark', () => {
    const world = makeWorld();

    // A slab over the whole world: nothing under it can reach the sky.
    world.setBlocks(0, 2, 0, 7, 2, 7, BlockTypeIds.Stone, 0);

    expect(world.getLightAt(3, 1, 3)).toBe(0);
    expect(world.getLightAt(3, 0, 3)).toBe(0);
  });

  it('attenuates light along a tunnel and retracts it when the tunnel is sealed', () => {
    const world = makeWorld();

    // A one-block tunnel along z at (2, 4, z), z=0..4, fully walled at both
    // ends: the west end (z=-1) is world void, the east end is a stone cap.
    world.setBlocks(2, 3, 0, 2, 3, 4, BlockTypeIds.Stone, 0); // ceiling
    world.setBlocks(2, 5, 0, 2, 5, 4, BlockTypeIds.Stone, 0); // floor
    world.setBlocks(1, 4, 0, 1, 4, 4, BlockTypeIds.Stone, 0); // west wall
    world.setBlocks(3, 4, 0, 3, 4, 4, BlockTypeIds.Stone, 0); // east wall
    world.setBlocks(2, 4, 5, 2, 4, 5, BlockTypeIds.Stone, 0); // east end (sealed)

    // Sealed at both ends: dark.
    expect(world.getLightAt(2, 4, 2)).toBe(0);

    // Open the east end: light cascades in, attenuated by 1 per block.
    world.setBlocks(2, 4, 5, 2, 4, 5, BlockTypeIds.Air, 0);

    expect(world.getLightAt(2, 4, 5)).toBe(15);
    expect(world.getLightAt(2, 4, 4)).toBe(14);
    expect(world.getLightAt(2, 4, 3)).toBe(13);
    expect(world.getLightAt(2, 4, 2)).toBe(12);
    expect(world.getLightAt(2, 4, 1)).toBe(11);
    expect(world.getLightAt(2, 4, 0)).toBe(10);

    // Seal it again: the whole cascade retracts to dark.
    world.setBlocks(2, 4, 5, 2, 4, 5, BlockTypeIds.Stone, 0);

    expect(world.getLightAt(2, 4, 4)).toBe(0);
    expect(world.getLightAt(2, 4, 2)).toBe(0);
    expect(world.getLightAt(2, 4, 0)).toBe(0);
  });

  it('restores light when a blocker is removed (undo)', () => {
    const world = makeWorld();

    world.setBlocks(2, 5, 2, 2, 7, 2, BlockTypeIds.Stone, 0);

    expect(world.getLightAt(2, 4, 2)).toBe(14);

    world.undo();

    expect(world.getLightAt(2, 4, 2)).toBe(15);
  });

  it('attenuates light through an enclosed water pool', () => {
    const world = makeWorld();

    // A 3-tall water column in a 3×3 shaft: stone all around, so the only
    // light path is straight down through the water (each water step costs 1).
    world.setBlocks(4, 0, 4, 7, 0, 7, BlockTypeIds.Stone, 0); // floor
    world.setBlocks(6, 0, 6, 6, 0, 6, BlockTypeIds.Air, 0); // shaft hole
    world.setBlocks(5, 1, 5, 7, 3, 7, BlockTypeIds.Stone, 0); // walls (3 tall)
    world.setBlocks(6, 1, 6, 6, 3, 6, BlockTypeIds.Water, 0); // water column

    expect(world.getLightAt(6, 3, 6)).toBe(14); // 1 step into water from the sky
    expect(world.getLightAt(6, 2, 6)).toBe(13); // each water step costs 1
    expect(world.getLightAt(6, 1, 6)).toBe(12);
    expect(world.getLightAt(6, 0, 6)).toBe(12); // air below the pool: free drop
  });

  it('transmits light through glass', () => {
    const world = makeWorld();

    world.setBlocks(0, 0, 0, 0, 7, 0, BlockTypeIds.Glass, 0);

    expect(world.getLightAt(0, 3, 0)).toBe(15); // glass column is open
    expect(world.getLightAt(1, 3, 0)).toBe(15);
  });

  it('gives a top-row water cell light 14 (entering water from the sky costs 1)', () => {
    const world = makeWorld();

    // The whole top row is water: no lit air neighbour exists that could
    // retract the column pass, so this checks the column pass directly.
    world.setBlocks(0, 7, 0, 7, 7, 7, BlockTypeIds.Water, 0);

    expect(world.getLightAt(3, 7, 3)).toBe(14);
    expect(world.getLightAt(3, 6, 3)).toBe(14); // free drop below the surface
    expect(world.getLightAt(3, 0, 3)).toBe(14);
  });

  it('propagates light across partition boundaries', () => {
    // 2×1×1 partitions of 4×8×4: the world is 8×8×4, partition 1 is x=4..7.
    const worldInfo = new WorldInfo({
      worldDimensionsInPartitions: new IntVector3(2, 1, 1),
      partitionDimensionsInBlocks: new IntVector3(4, 8, 4),
      partitionBoundaries: null,
    });

    const world = new World(worldInfo);
    world.init();
    world.setBlocks(0, 0, 0, 7, 7, 3, BlockTypeIds.Air, 0);

    // A slab over the top 3 rows of partition 1: the sky is blocked there,
    // so the light under the slab can only enter across the x=3|4 boundary
    // from partition 0.
    world.setBlocks(4, 5, 0, 7, 7, 3, BlockTypeIds.Stone, 0);

    world.ensureLightAround(world.getPartitionByIndex(1));

    expect(world.getLightAt(4, 4, 2)).toBe(14); // 1 horizontal step from the lit boundary
    expect(world.getLightAt(5, 4, 2)).toBe(13); // attenuated as it crosses
    expect(world.getLightAt(4, 0, 2)).toBe(14); // and falls straight down for free
  });
});

describe('Light engine vs brute force (random worlds)', () => {
  // mulberry32: small deterministic PRNG.
  function mulberry32(seed: number): () => number {
    let a = seed >>> 0;

    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The reference field: max over all paths from the top row of
  // (source level − path cost) — a multi-source Dijkstra whose edge costs
  // match Light's cost model (1 into water, 1 horizontal/up, 0 straight
  // down through air; opaque cells are walls, the void blocks light).
  function referenceLight(world: World): number[] {
    const wi = world.worldInfo;
    const dim = wi.worldDimensionsInBlocks;
    const n = dim.x * dim.y * dim.z;

    const typeAt = (x: number, y: number, z: number): number =>
      x < 0 || y < 0 || z < 0 || x >= dim.x || y >= dim.y || z >= dim.z
        ? -1
        : world.getBlock(x, y, z);

    const opaque = (t: number) => t !== 0 && t !== BlockTypeIds.Water && t !== BlockTypeIds.Glass;
    const costInto = (dy: number, t: number) => (t === BlockTypeIds.Water ? 1 : dy === -1 ? 0 : 1);

    // minCost = the light cost paid to reach the cell (0 for a top-row air
    // source, 1 for a top-row water source); light = max(0, 15 − minCost).
    const minCost = new Array<number>(n).fill(Infinity);

    for (let z = 0; z < dim.z; z++) {
      for (let x = 0; x < dim.x; x++) {
        const t = typeAt(x, dim.y - 1, z);

        if (t >= 0 && !opaque(t)) {
          minCost[wi.worldIndex(x, dim.y - 1, z)] = t === BlockTypeIds.Water ? 1 : 0;
        }
      }
    }

    const settled = new Array<boolean>(n).fill(false);
    const pos = new Int32Array(3);
    const dirs = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];

    for (let iter = 0; iter < n; iter++) {
      let u = -1;
      let best = Infinity;

      for (let i = 0; i < n; i++) {
        if (!settled[i] && minCost[i] < best) {
          best = minCost[i];
          u = i;
        }
      }

      if (u === -1) break;

      settled[u] = true;

      wi.worldPositionInto(pos, u);
      const ux = pos[0],
        uy = pos[1],
        uz = pos[2];

      for (let d = 0; d < 6; d++) {
        const dx = dirs[d * 3],
          dy = dirs[d * 3 + 1],
          dz = dirs[d * 3 + 2];
        const nx = ux + dx,
          ny = uy + dy,
          nz = uz + dz;

        const t = typeAt(nx, ny, nz);
        if (t < 0 || opaque(t)) continue;

        const v = wi.worldIndex(nx, ny, nz);
        const alt = best + costInto(dy, t);
        if (alt < minCost[v]) minCost[v] = alt;
      }
    }

    const ref = new Array<number>(n);

    for (let x = 0; x < dim.x; x++) {
      for (let y = 0; y < dim.y; y++) {
        for (let z = 0; z < dim.z; z++) {
          const i = wi.worldIndex(x, y, z);
          const t = typeAt(x, y, z);

          ref[i] = opaque(t) ? 0 : Math.max(0, 15 - minCost[i]);
        }
      }
    }

    return ref;
  }

  function fillRandom(world: World, rand: () => number): void {
    const dim = world.worldInfo.worldDimensionsInBlocks;

    for (let z = 0; z < dim.z; z++) {
      for (let y = 0; y < dim.y; y++) {
        for (let x = 0; x < dim.x; x++) {
          const r = rand();
          const type =
            r < 0.3
              ? BlockTypeIds.Stone
              : r < 0.4
                ? BlockTypeIds.Water
                : r < 0.45
                  ? BlockTypeIds.Glass
                  : BlockTypeIds.Air;

          world.setBlocks(x, y, z, x, y, z, type, 0);
        }
      }
    }
  }

  function expectMatchesReference(world: World): void {
    const ref = referenceLight(world);
    const wi = world.worldInfo;
    const dim = wi.worldDimensionsInBlocks;
    let firstMismatch: string | null = null;

    for (let z = 0; z < dim.z && firstMismatch === null; z++) {
      for (let y = 0; y < dim.y && firstMismatch === null; y++) {
        for (let x = 0; x < dim.x; x++) {
          const actual = world.getLightAt(x, y, z);
          const expected = ref[wi.worldIndex(x, y, z)];

          if (actual !== expected) {
            firstMismatch = `light(${x},${y},${z}) = ${actual}, expected ${expected}`;
          }
        }
      }
    }

    expect(firstMismatch ?? '', firstMismatch ?? 'field matches the reference').toBe('');
  }

  it('matches the brute-force field on random worlds and after random edits', () => {
    for (const seed of [1, 2, 3]) {
      const world = makeWorld();
      const rand = mulberry32(seed);

      fillRandom(world, rand);
      expectMatchesReference(world);

      // Random single-cell edits exercise additions and retractions.
      const dim = world.worldInfo.worldDimensionsInBlocks;
      const types = [BlockTypeIds.Air, BlockTypeIds.Stone, BlockTypeIds.Water, BlockTypeIds.Glass];

      for (let i = 0; i < 40; i++) {
        const x = Math.floor(rand() * dim.x);
        const y = Math.floor(rand() * dim.y);
        const z = Math.floor(rand() * dim.z);

        world.setBlocks(x, y, z, x, y, z, types[Math.floor(rand() * types.length)], 0);
      }

      expectMatchesReference(world);
    }
  }, 120000);
});

describe('Per-vertex AO and light in geometry', () => {
  function makeGeometryWorld(): { world: World; worldGeometry: WorldGeometry } {
    const world = makeWorld();

    Loader.Instance = new Loader(world.worldInfo, world);

    return { world, worldGeometry: new WorldGeometry(world.worldInfo, world) };
  }

  // The per-vertex light values (data.z) of the first face of the block at
  // worldIndex with the given side.
  function findFace(geo: PartitionGeometryData, worldIndex: number, side: number): number[] {
    const { data, offset } = geo.data;

    for (let i = 0; i < offset.length; i += 6) {
      if (offset[i] !== worldIndex) continue;
      if (data[i * 4 + constants.VERTEX_DATA_SIDE] !== side) continue;

      const lights: number[] = [];

      for (let k = 0; k < 6; k++) lights.push(data[(i + k) * 4 + constants.VERTEX_DATA_LIGHT]);

      return lights;
    }

    throw new Error(`No face with side ${side} for block ${worldIndex}`);
  }

  function expectLights(lights: number[], expected: number[]): void {
    expect(lights.length).toBe(expected.length);

    for (let i = 0; i < expected.length; i++) {
      // Precision 5: the per-vertex light lives in a Float32Array
      // (e.g. 0.2 is stored as 0.20000000298), so tighter tolerances fail.
      expect(lights[i], `vertex ${i}`).toBeCloseTo(expected[i], 5);
    }
  }

  it('shades a concave corner like Minecraft (per-vertex AO)', () => {
    const { world, worldGeometry } = makeGeometryWorld();

    // A floor at y=0 (x=0..3, z=0..3) with two wall blocks above it,
    // forming a concave corner at the top face of block (1, 0, 1).
    world.setBlocks(0, 0, 0, 3, 0, 3, BlockTypeIds.Stone, 0);
    world.setBlocks(0, 1, 1, 0, 1, 1, BlockTypeIds.Stone, 0); // occluder at (0,1,1)
    world.setBlocks(1, 1, 2, 1, 1, 2, BlockTypeIds.Stone, 0); // occluder at (1,1,2)

    const geo = worldGeometry.getPartitionGeometry(0);
    const windex = world.worldInfo.worldIndex(1, 0, 1);

    // Sky light is 15 and top faces use full brightness; the corner factor
    // is (ao+1)/4 with the outside-cell light multiplied in:
    //  (1,1): occluder (1,1,2) on one side → ao 2 → 0.75
    //  (1,0): open → ao 3 → 1.0
    //  (0,0): occluder (0,1,1) on one side → ao 2 → 0.75
    //  (0,1): both sides occluded, and its outside cell (1,1,2) is the
    //         occluder itself (light 0) → 0
    expectLights(findFace(geo, windex, 3), [
      0.75, // (1,1)
      1.0, // (1,0)
      0.75, // (0,0)
      0, // (0,1)
      0.75, // (1,1)
      0.75, // (0,0)
    ]);
  });

  it('does not let glass occlude AO', () => {
    const { world, worldGeometry } = makeGeometryWorld();

    world.setBlocks(0, 0, 0, 3, 0, 3, BlockTypeIds.Stone, 0);
    world.setBlocks(0, 1, 1, 0, 1, 1, BlockTypeIds.Glass, 0); // glass: no AO
    world.setBlocks(1, 1, 2, 1, 1, 2, BlockTypeIds.Stone, 0);

    const geo = worldGeometry.getPartitionGeometry(0);
    const windex = world.worldInfo.worldIndex(1, 0, 1);

    //  (1,1): stone (1,1,2) → 0.75
    //  (1,0): open → 1.0
    //  (0,0): the glass at (0,1,1) does not occlude → 1.0
    //  (0,1): outside cell is the stone at (1,1,2) → 0
    expectLights(findFace(geo, windex, 3), [
      0.75, // (1,1)
      1.0, // (1,0)
      1.0, // (0,0)
      0, // (0,1)
      0.75, // (1,1)
      1.0, // (0,0)
    ]);
  });

  it('lands AO levels on the correct corners of side faces', () => {
    const { world, worldGeometry } = makeGeometryWorld();

    // An isolated block at (1, 1, 1) with two occluders in the outer plane
    // of its +x face (x=2). Side 1's in-plane axes are (y, z), so corner
    // (a, b) samples the outside cell (2, 1+a, 1+b) — the occluders sit on
    // side-neighbour cells only, never on a sampled outside cell, so all
    // sampled light is full sky:
    //  (2,0,1) is the y-side of corners (0,0) and (0,1);
    //  (2,1,0) is the z-side of corners (0,0) and (1,0).
    //  (1,1): no occluders → ao 3 → ×1.0
    //  (0,1): occluder (2,0,1) on one side → ao 2 → ×0.75
    //  (1,0): occluder (2,1,0) on one side → ao 2 → ×0.75
    //  (0,0): occluders on both sides → ao 0 → ×0.25
    world.setBlocks(1, 1, 1, 1, 1, 1, BlockTypeIds.Stone, 0);
    world.setBlocks(2, 0, 1, 2, 0, 1, BlockTypeIds.Stone, 0);
    world.setBlocks(2, 1, 0, 2, 1, 0, BlockTypeIds.Stone, 0);

    const geo = worldGeometry.getPartitionGeometry(0);
    const windex = world.worldInfo.worldIndex(1, 1, 1);

    // Outside cells (2, 1+a, 1+b) are all open sky (15); side faces use
    // brightness 0.8. FACES side-1 corner order: (1,1) (0,1) (0,0) (1,0)
    // (1,1) (0,0).
    expectLights(findFace(geo, windex, 1), [
      0.8, // (1,1)
      0.8 * 0.75, // (0,1)
      0.8 * 0.25, // (0,0)
      0.8 * 0.75, // (1,0)
      0.8, // (1,1)
      0.8 * 0.25, // (0,0)
    ]);
  });

  it('leaves an isolated block fully lit on top and dark underneath', () => {
    const { world, worldGeometry } = makeGeometryWorld();

    world.setBlocks(4, 0, 4, 4, 0, 4, BlockTypeIds.Stone, 0);

    const geo = worldGeometry.getPartitionGeometry(0);
    const windex = world.worldInfo.worldIndex(4, 0, 4);

    // Top face: open sky (15), full brightness, no occlusion.
    expectLights(findFace(geo, windex, 3), [1.0, 1.0, 1.0, 1.0, 1.0, 1.0]);

    // Bottom face samples the void below the world: no light at all.
    expectLights(findFace(geo, windex, 2), [0, 0, 0, 0, 0, 0]);
  });

  it('samples the sky light of the air each vertex points into', () => {
    const { world, worldGeometry } = makeGeometryWorld();

    // A slab at (2, 2, 2): the bottom face's corners sample the four air
    // cells below its corners. Only the corner directly under the slab is
    // in a blocked column (light 14); the other three sit in open columns
    // (light 15).
    world.setBlocks(2, 2, 2, 2, 2, 2, BlockTypeIds.Stone, 0);

    const geo = worldGeometry.getPartitionGeometry(0);
    const windex = world.worldInfo.worldIndex(2, 2, 2);

    // Bottom face (side 2) brightness is 0.5; corner order (x, z) of the
    // sampled cell (2+a, 1, 2+b): (1,0) (1,1) (0,1) (0,0) (1,0) (0,1).
    expectLights(findFace(geo, windex, 2), [
      0.5, // (3,1,2): open column
      0.5, // (3,1,3): open column
      0.5, // (2,1,3): open column
      (14 / 15) * 0.5, // (2,1,2): under the slab
      0.5, // (3,1,2): open column
      0.5, // (2,1,3): open column
    ]);
  });

  it('samples light in world coordinates for offset partitions', () => {
    // 2×1×2 partitions of 4×8×4: the world is 8×8×8. Partition 0 is
    // (x=0..3, z=0..3), partition 3 is (x=4..7, z=4..7).
    const worldInfo = new WorldInfo({
      worldDimensionsInPartitions: new IntVector3(2, 1, 2),
      partitionDimensionsInBlocks: new IntVector3(4, 8, 4),
      partitionBoundaries: null,
    });

    const world = new World(worldInfo);
    world.init();
    world.setBlocks(0, 0, 0, 7, 7, 7, BlockTypeIds.Air, 0);

    Loader.Instance = new Loader(world.worldInfo, world);
    const worldGeometry = new WorldGeometry(world.worldInfo, world);

    // A slab over all of partition 0 (y=2): blocks the sky there, but not
    // over partition 3.
    world.setBlocks(0, 2, 0, 3, 2, 3, BlockTypeIds.Stone, 0);

    // An isolated block in partition 3: its top face must read the open
    // sky (15). Sampling partition-local coordinates would read
    // partition 0's region (under the slab, 14).
    world.setBlocks(5, 0, 5, 5, 0, 5, BlockTypeIds.Stone, 0);

    const geo3 = worldGeometry.getPartitionGeometry(3);
    expectLights(
      findFace(geo3, world.worldInfo.worldIndex(5, 0, 5), 3),
      [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    );

    // And a block in partition 0 at the slab's corner: the slab covers
    // x=0..3, z=0..3, so light under it attenuates from the open edges
    // (light(x,1,z) = 15 − min(4−x, 4−z)). Block (3,0,3)'s top face sits
    // half in the slab's shadow: one corner samples the cell under the
    // slab edge, (3,1,3) = 14; the other three sample open columns at
    // x=4 or z=4 (15).
    world.setBlocks(3, 0, 3, 3, 0, 3, BlockTypeIds.Stone, 0);

    const geo0 = worldGeometry.getPartitionGeometry(0);
    expectLights(findFace(geo0, world.worldInfo.worldIndex(3, 0, 3), 3), [
      1.0, // (4,1,4): open column
      1.0, // (4,1,3): open column
      14 / 15, // (3,1,3): under the slab edge
      1.0, // (3,1,4): open column
      1.0, // (4,1,4): open column
      14 / 15, // (3,1,3): under the slab edge
    ]);
  });

  it('lights template geometry (fence) from the cell above the block', async () => {
    const { world, worldGeometry } = makeGeometryWorld();

    await Loader.Instance.init();

    const fence = Loader.Instance.getGeometry(BlockTypeIds.Fence);
    const vertexCount = fence.getVertexCount();

    world.setBlocks(4, 0, 4, 4, 0, 4, BlockTypeIds.Fence, 0);

    const windex = world.worldInfo.worldIndex(4, 0, 4);

    const lightsAt = (geo: PartitionGeometryData): number[] => {
      const { data, offset } = geo.data;
      const start = offset.indexOf(windex);
      expect(start).toBeGreaterThanOrEqual(0);

      const lights: number[] = [];

      for (let i = start; i < start + vertexCount; i++) {
        lights.push(data[i * 4 + constants.VERTEX_DATA_LIGHT]);
      }

      return lights;
    };

    // Open sky above: (15/15) × 0.9. (Precision 5: the light values live
    // in a Float32Array.)
    const geo = worldGeometry.getPartitionGeometry(0);
    for (const light of lightsAt(geo)) expect(light).toBeCloseTo(0.9, 5);

    // A roof over the fence: the sampled cell (one above) is under the
    // slab → 14.
    world.setBlocks(4, 2, 4, 4, 2, 4, BlockTypeIds.Stone, 0);

    const geo2 = worldGeometry.getPartitionGeometry(0);

    for (const light of lightsAt(geo2)) expect(light).toBeCloseTo((14 / 15) * 0.9, 5);
  });
});
