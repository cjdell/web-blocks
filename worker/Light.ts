import { BlockTypeIds } from '../common/BlockTypeList';
import Partition from './Partition';
import World from './World';

const MAX_LIGHT = 15;
const VALUES_PER_BLOCK = 3;

// The six face-adjacent directions: +x, -x, +y, -y, +z, -z.
const DIRS = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];

/**
 * Minecraft-style sky light engine.
 *
 * Every cell holds a sky light level 0-15 (stored per partition, lazily
 * computed). Light sources are the cells above the world top; light
 * propagates to adjacent transparent cells at a cost of 1 per horizontal or
 * upward step, 0 for straight-down steps through air, and 1 for any step
 * into water. Opaque blocks (everything but air, water and glass) block
 * light entirely.
 *
 * A partition gets its light on first use (ensurePartitionLight): a column
 * pass writes the exact "direct sky" contribution (always a valid lower
 * bound), then the global work queue relaxes the field to its unique fixed
 * point — additions raise a cell to a neighbour's contribution, and
 * retractions re-evaluate a cell that is no longer supported by its
 * neighbours. Whenever the queue is drained, the field is a fixed point of
 * the propagation rules (with uncomputed partitions treated as dark).
 *
 * Cross-partition flow never triggers a partition load from the queue or
 * from block changes: light into a partition enters through that
 * partition's own seeding (its dark cells touching lit neighbours, and the
 * push-to-neighbour pass that runs when the partition is computed). This
 * keeps a light computation bounded to the partitions actually requested.
 *
 * Block changes are reported with blockChanged(); the queue is drained at
 * batch boundaries (beginUpdate/endUpdate) or on demand (drain).
 *
 * The worker is single-threaded, so the scratch arrays below are shared
 * freely.
 */
export default class Light {
  private world: World;

  // Work queue of flat world indices awaiting (re)processing.
  private queue: number[] = [];
  private queueHead = 0;
  private queued = new Set<number>();
  // beginUpdate/endUpdate nesting; the queue drains when the outermost
  // batch ends.
  private batching = 0;

  // Scratch (read before the next write; never held across calls).
  private pos = new Int32Array(3);

  constructor(world: World) {
    this.world = world;
  }

  isOpaque(type: number): boolean {
    return type !== 0 && type !== BlockTypeIds.Water && type !== BlockTypeIds.Glass;
  }

  // Cost for light moving into the adjacent cell of type nType, where dy is
  // the y-difference (target - source): sky light falls straight down for
  // free, costs 1 horizontally or upward, and 1 for any step into water.
  private costInto(dy: number, nType: number): number {
    if (nType === BlockTypeIds.Water) return 1;
    return dy === -1 ? 0 : 1;
  }

  // Sky contribution to a transparent cell in the top row (0 otherwise).
  private skyLevel(type: number, wy: number): number {
    if (wy !== this.world.worldInfo.worldDimensionsInBlocks.y - 1) return 0;
    if (this.isOpaque(type)) return 0;
    return type === BlockTypeIds.Water ? MAX_LIGHT - 1 : MAX_LIGHT;
  }

  // (partition index, within-partition index) of a world cell, or null when
  // out of world bounds (the void blocks light).
  private cellAt(wx: number, wy: number, wz: number): { pindex: number; rindex: number } | null {
    const wi = this.world.worldInfo;
    const dim = wi.worldDimensionsInBlocks;

    if (wx < 0 || wx >= dim.x || wy < 0 || wy >= dim.y || wz < 0 || wz >= dim.z) return null;

    const px = wx >> wi.partitionBlockLogX;
    const py = wy >> wi.partitionBlockLogY;
    const pz = wz >> wi.partitionBlockLogZ;

    const pindex = wi.partitionIndex(px, py, pz);

    const rx = wx - (px << wi.partitionBlockLogX);
    const ry = wy - (py << wi.partitionBlockLogY);
    const rz = wz - (pz << wi.partitionBlockLogZ);

    const rindex = wi.localIndex(rx, ry, rz);

    return { pindex, rindex };
  }

  // The light level at a world cell. Above the world counts as full sky;
  // other out-of-bounds positions are void (dark).
  getLightAt(wx: number, wy: number, wz: number): number {
    const dim = this.world.worldInfo.worldDimensionsInBlocks;

    if (wy >= dim.y) return MAX_LIGHT;

    const c = this.cellAt(wx, wy, wz);
    if (c === null) return 0;

    const p = this.world.getPartitionByIndex(c.pindex);
    if (!p.lightValid) {
      this.ensurePartitionLight(c.pindex);
      this.drain();
    }

    return p.light![c.rindex];
  }

  // Ensure the light for the partition and its six face neighbours — the
  // one-cell halo a partition's faces sample — then settle the queue.
  ensureLightAround(partition: Partition): void {
    const wi = this.world.worldInfo;
    const ppos = wi.partitionPosition(partition.index);

    const offsets = [
      [0, 0, 0],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];

    this.beginUpdate();

    for (let i = 0; i < offsets.length; i++) {
      const px = ppos.x + offsets[i][0];
      const py = ppos.y + offsets[i][1];
      const pz = ppos.z + offsets[i][2];

      if (!wi.partitionInBounds(px, py, pz)) continue;

      this.ensurePartitionLight(wi.partitionIndex(px, py, pz));
    }

    this.endUpdate();
  }

  beginUpdate(): void {
    this.batching += 1;
  }

  endUpdate(): void {
    this.batching -= 1;

    if (this.batching === 0) this.drain();
  }

  // A block changed type at wpos. Updates the cell's own light and leaves
  // the neighbours for the next drain (callers batch with
  // beginUpdate/endUpdate; an unbatched change drains immediately).
  blockChanged(wpos: { x: number; y: number; z: number }, oldType: number, newType: number): void {
    if (oldType === newType) return;

    const wx = wpos.x,
      wy = wpos.y,
      wz = wpos.z;

    const c = this.cellAt(wx, wy, wz);
    if (c === null) return;

    const p = this.world.getPartitionByIndex(c.pindex);
    this.ensurePartitionLight(c.pindex);

    const light = p.light!;
    const windex = this.world.worldInfo.worldIndex(wx, wy, wz);

    if (this.isOpaque(newType)) {
      if (light[c.rindex] > 0) {
        light[c.rindex] = 0;
        this.enqueue(windex);
      }
    } else {
      let candidate = this.skyLevel(newType, wy);

      for (let d = 0; d < 6; d++) {
        const dx = DIRS[d * 3],
          dy = DIRS[d * 3 + 1],
          dz = DIRS[d * 3 + 2];

        const m = this.cellAt(wx + dx, wy + dy, wz + dz);
        if (m === null) continue;

        // Uncomputed neighbours count as dark; light flows in when they are
        // computed (their seeding sees this cell's new light).
        const mp = this.world.partitions[m.pindex];
        if (!mp || !mp.lightValid) continue;

        const mType = mp.blocks![m.rindex * VALUES_PER_BLOCK];
        if (this.isOpaque(mType)) continue;

        const contrib = mp.light![m.rindex] - this.costInto(-dy, newType);
        if (contrib > candidate) candidate = contrib;
      }

      if (candidate !== light[c.rindex]) {
        light[c.rindex] = candidate;
        this.enqueue(windex);
      }
    }

    if (this.batching === 0) this.drain();
  }

  // Compute a partition's light if it has none yet: column pass (direct
  // sky), seeds for the queue, and a push into already-computed neighbours
  // so light crosses the boundary in both directions.
  ensurePartitionLight(pindex: number): void {
    const p = this.world.getPartitionByIndex(pindex);

    if (p.lightValid) return;

    this.columnPass(p);
    this.seedPartition(p);
    this.pushToNeighbours(p);

    p.lightValid = true;
  }

  private columnPass(p: Partition): void {
    const wi = this.world.worldInfo;
    const dimX = wi.partitionDimensionsInBlocks.x;
    const dimY = wi.partitionDimensionsInBlocks.y;
    const dimZ = wi.partitionDimensionsInBlocks.z;
    const blocks = p.blocks!;

    if (p.light === null) p.light = new Uint8Array(p.capacity);
    const light = p.light;

    for (let z = 0; z < dimZ; z++) {
      for (let x = 0; x < dimX; x++) {
        let level = MAX_LIGHT;
        let y = dimY - 1;

        for (; y >= 0; y--) {
          const rindex = wi.localIndex(x, y, z);
          const type = blocks[rindex * VALUES_PER_BLOCK];

          if (this.isOpaque(type)) break;

          // Deduct the cost of the step from the cell above (the sky, for
          // the top row) into this cell before writing its light: a top-row
          // water cell gets 14, not 15. The result is the exact direct-sky
          // contribution, always a valid lower bound of the true light.
          level = Math.max(0, level - this.costInto(-1, type));
          light[rindex] = level;
        }

        // Everything below the first opaque block starts dark; the queue
        // raises it where light actually reaches.
        for (; y >= 0; y--) {
          light[wi.localIndex(x, y, z)] = 0;
        }
      }
    }
  }

  // Enqueue this partition's dark transparent cells that a lit neighbour
  // could raise.
  private seedPartition(p: Partition): void {
    const wi = this.world.worldInfo;
    const dimX = wi.partitionDimensionsInBlocks.x;
    const dimY = wi.partitionDimensionsInBlocks.y;
    const dimZ = wi.partitionDimensionsInBlocks.z;
    const blocks = p.blocks!;
    const light = p.light!;
    const { x: ox, y: oy, z: oz } = p.offset;

    for (let z = 0; z < dimZ; z++) {
      for (let y = 0; y < dimY; y++) {
        for (let x = 0; x < dimX; x++) {
          const rindex = wi.localIndex(x, y, z);

          if (light[rindex] !== 0) continue;

          const type = blocks[rindex * VALUES_PER_BLOCK];
          if (this.isOpaque(type)) continue;

          const wx = ox + x,
            wy = oy + y,
            wz = oz + z;

          for (let d = 0; d < 6; d++) {
            const dx = DIRS[d * 3],
              dy = DIRS[d * 3 + 1],
              dz = DIRS[d * 3 + 2];

            const m = this.cellAt(wx + dx, wy + dy, wz + dz);
            if (m === null) continue;

            const mp = this.world.partitions[m.pindex];
            // Uncomputed neighbours count as dark; they seed themselves
            // from this partition when they are computed.
            if (!mp || !mp.lightValid) continue;

            const mType = mp.blocks![m.rindex * VALUES_PER_BLOCK];
            if (this.isOpaque(mType)) continue;

            // Light moves from m into c: the y-difference (target - source)
            // is -dy, since m = c + (dx, dy, dz).
            const contrib = mp.light![m.rindex] - this.costInto(-dy, type);
            if (contrib > 0) {
              this.enqueue(wi.worldIndex(wx, wy, wz));
              break;
            }
          }
        }
      }
    }
  }

  // For each already-computed face neighbour, enqueue its boundary cells
  // that this partition's new light can raise. (This partition's own
  // boundary cells get raised by the queue processing them, but a
  // neighbour computed before this one never saw this light.)
  private pushToNeighbours(p: Partition): void {
    const wi = this.world.worldInfo;
    const pdib = wi.partitionDimensionsInBlocks;
    const dims = [pdib.x, pdib.y, pdib.z];
    const ppos = wi.partitionPosition(p.index);
    const blocks = p.blocks!;
    const light = p.light!;

    // Each face: the offset to the neighbour partition, p's boundary layer
    // coordinate on the fixed axis, the neighbour's facing layer coordinate,
    // and the two free local axes (a, b) with their extents.
    const faces = [
      { off: [1, 0, 0], pFixed: [pdib.x - 1, -1, -1], qFixed: [0, -1, -1], a: 1, b: 2 },
      { off: [-1, 0, 0], pFixed: [0, -1, -1], qFixed: [pdib.x - 1, -1, -1], a: 1, b: 2 },
      { off: [0, 1, 0], pFixed: [-1, pdib.y - 1, -1], qFixed: [-1, 0, -1], a: 0, b: 2 },
      { off: [0, -1, 0], pFixed: [-1, 0, -1], qFixed: [-1, pdib.y - 1, -1], a: 0, b: 2 },
      { off: [0, 0, 1], pFixed: [-1, -1, pdib.z - 1], qFixed: [-1, -1, 0], a: 0, b: 1 },
      { off: [0, 0, -1], pFixed: [-1, -1, 0], qFixed: [-1, -1, pdib.z - 1], a: 0, b: 1 },
    ];

    for (let f = 0; f < faces.length; f++) {
      const face = faces[f];
      const [dx, dy, dz] = face.off;
      const fixed = 3 - face.a - face.b;

      const qpx = ppos.x + dx;
      const qpy = ppos.y + dy;
      const qpz = ppos.z + dz;
      if (!wi.partitionInBounds(qpx, qpy, qpz)) continue;

      const q = this.world.partitions[wi.partitionIndex(qpx, qpy, qpz)];
      if (!q || !q.lightValid) continue;

      for (let a = 0; a < dims[face.a]; a++) {
        for (let b = 0; b < dims[face.b]; b++) {
          const pLocal = [0, 0, 0];
          const qLocal = [0, 0, 0];
          pLocal[face.a] = a;
          pLocal[face.b] = b;
          pLocal[fixed] = face.pFixed[fixed];
          qLocal[face.a] = a;
          qLocal[face.b] = b;
          qLocal[fixed] = face.qFixed[fixed];

          const pRindex = wi.localIndex(pLocal[0], pLocal[1], pLocal[2]);
          const qRindex = wi.localIndex(qLocal[0], qLocal[1], qLocal[2]);

          const pType = blocks[pRindex * VALUES_PER_BLOCK];
          if (this.isOpaque(pType)) continue;

          const qType = q.blocks![qRindex * VALUES_PER_BLOCK];
          if (this.isOpaque(qType)) continue;

          const contrib = light[pRindex] - this.costInto(dy, qType);
          if (contrib > q.light![qRindex]) {
            const qwindex = wi.worldIndex(
              qpx * pdib.x + qLocal[0],
              qpy * pdib.y + qLocal[1],
              qpz * pdib.z + qLocal[2],
            );
            this.enqueue(qwindex);
          }
        }
      }
    }
  }

  private enqueue(windex: number): void {
    if (this.queued.has(windex)) return;

    this.queued.add(windex);
    this.queue.push(windex);
  }

  drain(): void {
    if (this.queueHead === this.queue.length) return;

    while (this.queueHead < this.queue.length) {
      const windex = this.queue[this.queueHead++];

      this.queued.delete(windex);
      this.processCell(windex);
    }

    this.queue.length = 0;
    this.queueHead = 0;
  }

  // Apply the propagation rules from one cell: raise dark neighbours this
  // cell can light (addition), and re-evaluate neighbours this cell can no
  // longer support (retraction).
  private processCell(windex: number): void {
    const wi = this.world.worldInfo;

    wi.worldPositionInto(this.pos, windex);
    const wx = this.pos[0],
      wy = this.pos[1],
      wz = this.pos[2];

    const c = this.cellAt(wx, wy, wz);
    if (c === null) return;

    const p = this.world.getPartitionByIndex(c.pindex);
    if (!p.lightValid) this.ensurePartitionLight(c.pindex);

    let level = p.light![c.rindex];

    // Pull as well as push: a cell can hold less than its neighbours (or
    // the sky) can currently give it. The column pass writes a partition's
    // light without enqueueing it, and churn can lower a cell while its
    // supporters are transiently low — in both cases a correct level would
    // never reach the neighbours if processing only pushed this cell's own
    // (stale) value. Re-evaluate this cell's own support first, so a
    // processing settles the cell to what its current neighbourhood gives
    // it, then pushes that.
    const cType = p.blocks![c.rindex * VALUES_PER_BLOCK];
    if (!this.isOpaque(cType)) {
      const self = this.supportLevel(wx, wy, wz, cType);
      if (self > level) {
        p.light![c.rindex] = self;
        level = self;
      }
    }

    for (let d = 0; d < 6; d++) {
      const dx = DIRS[d * 3],
        dy = DIRS[d * 3 + 1],
        dz = DIRS[d * 3 + 2];

      const n = this.cellAt(wx + dx, wy + dy, wz + dz);
      if (n === null) continue;

      // Never load a partition from the queue: light into it arrives when
      // it is computed (its seeding sees this cell's light).
      const np = this.world.partitions[n.pindex];
      if (!np || !np.isInited()) continue;
      if (!np.lightValid) this.ensurePartitionLight(n.pindex);

      const nType = np.blocks![n.rindex * VALUES_PER_BLOCK];
      if (this.isOpaque(nType)) continue;

      const nLight = np.light![n.rindex];
      const contrib = level - this.costInto(dy, nType);
      const nwindex = wi.worldIndex(wx + dx, wy + dy, wz + dz);

      if (contrib > nLight) {
        np.light![n.rindex] = contrib;
        this.enqueue(nwindex);
      } else if (nLight > contrib) {
        // n may have been lit by this cell (or by a cell this cell lit):
        // check what supports it now.
        const support = this.supportLevel(wx + dx, wy + dy, wz + dz, nType);

        if (support < nLight) {
          np.light![n.rindex] = support;
          this.enqueue(nwindex);
        }
      }
    }
  }

  // The level a transparent cell can hold from its neighbours and the sky,
  // given their current light.
  private supportLevel(nx: number, ny: number, nz: number, nType: number): number {
    let support = this.skyLevel(nType, ny);

    for (let d = 0; d < 6; d++) {
      const dx = DIRS[d * 3],
        dy = DIRS[d * 3 + 1],
        dz = DIRS[d * 3 + 2];

      const m = this.cellAt(nx + dx, ny + dy, nz + dz);
      if (m === null) continue;

      const mp = this.world.partitions[m.pindex];
      if (!mp || !mp.isInited()) continue;
      if (!mp.lightValid) this.ensurePartitionLight(m.pindex);

      const mType = mp.blocks![m.rindex * VALUES_PER_BLOCK];
      if (this.isOpaque(mType)) continue;

      const contrib = mp.light![m.rindex] - this.costInto(-dy, nType);
      if (contrib > support) support = contrib;
    }

    return support;
  }
}
