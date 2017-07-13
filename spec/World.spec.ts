import chai = require('chai');
import com from '../common/WorldInfo';
import World from '../worker/World';

const expect = chai.expect;

describe('World', () => {
  it('can create an empty world', () => {
    const worldInfo = new com.WorldInfo({
      worldDimensionsInPartitions: new com.IntVector3(4, 1, 4),
      partitionDimensionsInBlocks: new com.IntVector3(256, 32, 256),
      partitionBoundaries: null
    });

    const world = new World(worldInfo);

    console.time('init');
    world.init();
    console.timeEnd('init');

    world.getPartitionByIndex(0);
    world.getPartitionByIndex(1);
    world.getPartitionByIndex(2);
    world.getPartitionByIndex(4);

    world.getPartitionByIndex(5);

    world.getPartitionByIndex(6);
    world.getPartitionByIndex(8);
    world.getPartitionByIndex(9);
    world.getPartitionByIndex(10);

    console.time('getVisibleBlocks');
    const result = world.getVisibleBlocks(5);
    console.timeEnd('getVisibleBlocks');

    console.time('getBlock');
    for (let z = 0; z < worldInfo.partitionDimensionsInBlocks.z; z += 1) {
      for (let y = 0; y < worldInfo.partitionDimensionsInBlocks.y; y += 1) {
        for (let x = 0; x < worldInfo.partitionDimensionsInBlocks.x; x += 1) {
          const type = world.getBlock(x, y, z);
        }
      }
    }
    console.timeEnd('getBlock');

    expect(world.partitions.length).to.be.equal(16);
  });

  it('can convert from pos to index quickly', () => {
    const worldInfo = new com.WorldInfo({
      worldDimensionsInPartitions: new com.IntVector3(128, 1, 128),
      partitionDimensionsInBlocks: new com.IntVector3(256, 256, 256),
      partitionBoundaries: null
    });

    let i = 0;
    let errors = 0;

    for (let z = 0; z < worldInfo.partitionDimensionsInBlocks.z; z += 1) {
      for (let y = 0; y < worldInfo.partitionDimensionsInBlocks.y; y += 1) {
        for (let x = 0; x < worldInfo.partitionDimensionsInBlocks.x; x += 1, i += 1) {
          let index = worldInfo.rindex(x, y, z);

          if (index !== i) errors += 1;
        }
      }
    }

    expect(errors).to.equal(0);
  });

  it('can rposw', () => {
    const worldInfo = new com.WorldInfo({
      worldDimensionsInPartitions: new com.IntVector3(128, 1, 128),
      partitionDimensionsInBlocks: new com.IntVector3(256, 256, 256),
      partitionBoundaries: null
    });

    let errors = 0;

    for (let z = 0; z < worldInfo.partitionDimensionsInBlocks.z; z += 1) {
      for (let y = 0; y < worldInfo.partitionDimensionsInBlocks.y; y += 1) {
        for (let x = 0; x < worldInfo.partitionDimensionsInBlocks.x; x += 1) {
          const ox = 1024, oz = 1024;

          const rpos = worldInfo.rposw(ox + x, 0, oz + z);

          if (rpos.x !== x) errors += 1;
          if (rpos.z !== z) errors += 1;
        }
      }
    }

    expect(errors).to.equal(0);
  });
});
