global.self = {};

var expect = require('expect.js');

var THREE = require('../three.v71');
var Partition = require('../Partition');

describe('Partition', function() {
  it('can create an empty partition', function() {
    var partition = new Partition(new THREE.Vector3(4, 4, 4), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));

    var dimensions = partition.dimensions;

    expect([dimensions.x, dimensions.y, dimensions.z]).to.eql([4, 4, 4]);

    var capacity = partition.capacity;

    expect(capacity).to.equal(64);

    var blockType = partition.getBlock(new THREE.Vector3(0, 0, 0));

    expect(blockType).to.equal(0);

    var changes = partition.getChanges();

    expect(changes.blocks).to.eql([]);
  });

  it('has point boundaries', function() {
    var partition = new Partition(new THREE.Vector3(4, 4, 4), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));

    var boundaries = partition.getBoundaries();

    expect(boundaries[0]).to.eql({ x: 0, y: 0, z: 0 });

    expect(boundaries[7]).to.eql({ x: 4, y: 4, z: 4 });
  });

  it('can add some blocks', function() {
    var partition = new Partition(new THREE.Vector3(4, 4, 4), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));

    partition.setBlock(new THREE.Vector3(0, 0, 0), 1);
    partition.setBlock(new THREE.Vector3(1, 0, 0), 2);
    partition.setBlock(new THREE.Vector3(1, 1, 1), 3);

    var blockType;

    blockType = partition.getBlock(new THREE.Vector3(0, 0, 0));

    expect(blockType).to.equal(1);

    blockType = partition.getBlock(new THREE.Vector3(1, 0, 0));

    expect(blockType).to.equal(2);

    blockType = partition.getBlock(new THREE.Vector3(1, 1, 1));

    expect(blockType).to.equal(3);

    var changes;

    changes = partition.getChanges();

    expect(changes.blocks).to.eql([
      { id: 1, index: 0, indexInWorld: 0, type: 1 },
      { id: 2, index: 1, indexInWorld: 1, type: 2 },
      { id: 3, index: 21, indexInWorld: 21, type: 3 }
    ]);

    partition.setBlock(new THREE.Vector3(1, 1, 1), 0);
    partition.setBlock(new THREE.Vector3(2, 1, 1), 1);
    partition.setBlock(new THREE.Vector3(3, 3, 3), 0);

    changes = partition.getChanges();

    expect(changes.blocks).to.eql([
      { id: 3, index: 21, indexInWorld: 21, type: 0 },
      { id: 4, index: 22, indexInWorld: 22, type: 1 }
    ]);

    changes = partition.getAllChanges();

    expect(changes.blocks).to.eql([
      { id: 1, index: 0, indexInWorld: 0, type: 1 },
      { id: 2, index: 1, indexInWorld: 1, type: 2 },
      { id: 3, index: 21, indexInWorld: 21, type: 0 },
      { id: 4, index: 22, indexInWorld: 22, type: 1 }
    ]);

    expect(changes.maxId).to.eql(4);
  });

  it('is fast', function() {
    var partition = new Partition(new THREE.Vector3(128, 128, 128), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));

    partition.setBlocks(new THREE.Vector3(32, 32, 32), new THREE.Vector3(95, 95, 95), 1);

    var changes;

    changes = partition.getChanges();

    expect(changes.blocks.length).to.equal(64 * 64 * 64 - 62 * 62 * 62);

    partition.setBlocks(new THREE.Vector3(0, 0, 0), new THREE.Vector3(127, 127, 127), 1);

    changes = partition.getChanges();

    expect(changes.blocks.length).to.equal(128 * 128 * 128 - 126 * 126 * 126);
  });

  it('adds blocks to fill in holes', function() {
    var partition = new Partition(new THREE.Vector3(8, 8, 8), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));

    partition.setBlocks(new THREE.Vector3(2, 2, 2), new THREE.Vector3(5, 5, 5), 1);

    var changes;

    changes = partition.getChanges();

    expect(changes.blocks.length).to.be(56);

    partition.setBlock(new THREE.Vector3(3, 3, 2), 0);

    changes = partition.getChanges();

    expect(changes.blocks).to.eql([
      { id: 6, index: 155, indexInWorld: 155, type: 0 },
      { id: 57, index: 219, indexInWorld: 219, type: 1 }
    ]);
  });
});
