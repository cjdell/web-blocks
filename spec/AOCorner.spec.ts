import { describe, expect, it } from 'vitest';
import { IntVector3, WorldInfo } from '../common/WorldInfo';
import World from '../worker/World';
import PartitionGeometry from '../worker/PartitionGeometry';
import { Loader } from '../worker/Geometry/Loader';
import { BlockTypeIds } from '../common/BlockTypeList';

const STONE = BlockTypeIds.Stone;

function makeWorld() {
  // 32 x 128 x 32, like production, so a structure placed mid-height is
  // comfortably lit from the sky row at the top.
  const worldInfo = new WorldInfo({
    worldDimensionsInPartitions: new IntVector3(1, 1, 1),
    partitionDimensionsInBlocks: new IntVector3(32, 128, 32),
    partitionBoundaries: null,
  });
  const world = new World(worldInfo);
  world.init();
  Loader.Instance = new Loader(worldInfo, world);
  return { world, worldInfo };
}

function vertices(world: World, worldInfo: WorldInfo) {
  const p = world.getPartitionByIndex(0);
  const geo = new PartitionGeometry(worldInfo, p, world);
  geo.generateGeometry();
  const { position, data } = geo;
  const out: { x: number; y: number; z: number; side: number; light: number }[] = [];
  for (let i = 0; i < position.length / 3; i++) {
    out.push({
      x: Math.round(position[i * 3 + 0]),
      y: Math.round(position[i * 3 + 1]),
      z: Math.round(position[i * 3 + 2]),
      side: Math.round(data[i * 4 + 1]),
      light: data[i * 4 + 2],
    });
  }
  return out;
}

describe('per-vertex ambient occlusion', () => {
  it('darkens a concave inside corner and does not darken a convex edge', () => {
    const { world, worldInfo } = makeWorld();
    const TOP = 120; // world top row is y=127; keep structures well lit.

    // (a) Concave room corner: floor + two walls meeting at x=0, z=0, open sky.
    // Walls sit directly above the floor (no air gap) so the AO side-samples
    // at the floor's top landing on the walls.
    world.setBlocks(0, TOP - 2, 0, 12, TOP - 2, 12, STONE, 0); // floor
    world.setBlocks(0, TOP - 1, 0, 12, TOP + 1, 0, STONE, 0); // z=0 wall
    world.setBlocks(0, TOP - 1, 0, 0, TOP + 1, 12, STONE, 0); // x=0 wall

    // (b) Convex step: a raised block beside a lower one. Its outer front-top
    //     edge is a convex edge -> should stay bright.
    world.setBlocks(20, TOP - 2, 0, 32, TOP + 2, 12, STONE, 0); // base
    world.setBlocks(20, TOP + 3, 0, 24, TOP + 5, 4, STONE, 0); // raised step

    const vs = vertices(world, worldInfo);

    // Floor block sits at y=TOP-2, so its top face (and vertices) are at y=TOP-1.
    // The deepest concave vertex is the top-face (0,0) corner of the floor block
    // ONE in from the corner, (1,TOP-2,1): its two in-plane side cells above,
    // (0,TOP,1) and (1,TOP,0), are both walls -> AO level 0 (darkest).
    const concave = vs.filter((v) => v.side === 3 && v.x === 1 && v.y === TOP - 1 && v.z === 1);
    // Open floor vertex: top face of an interior floor block, fully under sky.
    const open = vs.filter(
      (v) => v.side === 3 && v.y === TOP - 1 && v.x >= 5 && v.x <= 7 && v.z >= 5 && v.z <= 7,
    );
    // Convex edge vertex: raised step front-top corner at world (20,TOP+6,0).
    const convex = vs.filter((v) => v.side === 3 && v.x === 20 && v.y === TOP + 6 && v.z === 0);

    const c = concave[0]?.light;
    const o = open.reduce((m, v) => Math.max(m, v.light), -Infinity);
    const x = convex[0]?.light;

    console.log('concave inside-corner vertex (1,TOP-1,1) top =', c?.toFixed(3));
    console.log('open floor vertex            mid floor      =', o?.toFixed(3));
    console.log('convex step edge vertex      (20,TOP+6,0)   =', x?.toFixed(3));

    expect(concave.length, 'concave vertex present').toBeGreaterThan(0);
    expect(open.length, 'open vertex present').toBeGreaterThan(0);
    expect(convex.length, 'convex vertex present').toBeGreaterThan(0);

    // Inside corner is heavily occluded (Minecraft AO ~0.25); open floor and
    // convex edge are fully lit (~1.0).
    expect(c!).toBeLessThan(0.35);
    expect(o!).toBeGreaterThan(0.9);
    expect(x!).toBeGreaterThan(0.9);
    // The concave vertex must be clearly darker than both.
    expect(c!).toBeLessThan(o!);
    expect(c!).toBeLessThan(x!);
  });
});
