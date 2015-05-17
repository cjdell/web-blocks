global.self = {};

var expect = require('expect.js');

var THREE = require('../three.v71');
var World = require('../World');

describe('World', function() {
  it('can create an empty world', function() {
    var partitionDimensions = new THREE.Vector3(4, 4, 4);
    var worldDimensions = new THREE.Vector3(2, 1, 2);

    var world = new World(worldDimensions, partitionDimensions);

    world.setBlocks(new THREE.Vector3(3, 0, 3), new THREE.Vector3(4, 0, 4), 1);

    var partitions = world.getPartitions();

    expect(partitions.length).to.be(4);

    partitions.forEach(function(partition, index) {
      var changes = partition.getChanges();

      expect(partition.index).to.equal(index);

      expect(changes.blocks.length).to.be(1);
    });

    expect(world.getBlockDimensions()).to.eql({ x: 8, y: 4, z: 8 });

    //console.log(world);
  });

  it('has point boundaries of each possible partition', function() {
    var partitionDimensions = new THREE.Vector3(4, 4, 4);
    var worldDimensions = new THREE.Vector3(2, 1, 2);

    var world = new World(worldDimensions, partitionDimensions);

    var partitions = world.getPartitionBoundaries();

    var boundaries;

    expect(partitions[0].partitionIndex).to.equal(0);

    boundaries = partitions[0].points;

    expect(boundaries[0]).to.eql({ x: 0, y: 0, z: 0 });
    expect(boundaries[7]).to.eql({ x: 4, y: 4, z: 4 });

    expect(partitions[3].partitionIndex).to.equal(3);

    boundaries = partitions[3].points;

    expect(boundaries[0]).to.eql({ x: 4, y: 0, z: 4 });
    expect(boundaries[7]).to.eql({ x: 8, y: 4, z: 8 });
  });
});
