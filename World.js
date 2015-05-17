if (typeof module === 'object') {
  var THREE = require('./three.v71');
  var Partition = require('./Partition');

  module.exports = World;
}

function World(worldDimensionsInPartitions, partitionDimensionsInBlocks) {
  var capacity = worldDimensionsInPartitions.x * worldDimensionsInPartitions.y * worldDimensionsInPartitions.z;

  var partitionCapacity = partitionDimensionsInBlocks.x * partitionDimensionsInBlocks.y * partitionDimensionsInBlocks.z;

  var worldDimensionsInBlocks = new THREE.Vector3(worldDimensionsInPartitions.x * partitionDimensionsInBlocks.x, worldDimensionsInPartitions.y * partitionDimensionsInBlocks.y, worldDimensionsInPartitions.z * partitionDimensionsInBlocks.z);

  var partitions;

  init();

  function init() {
    partitions = new Array(capacity);

    for (var z = 0; z < worldDimensionsInPartitions.z; z++) {
      for (var y = 0; y < worldDimensionsInPartitions.y; y++) {
        for (var x = 0; x < worldDimensionsInPartitions.x; x++) {
          var partitionPosition = new THREE.Vector3(x, y, z);
          var partitionIndex = getPartitionIndex(x, y, z);

          var partition = new Partition(partitionDimensionsInBlocks, partitionPosition, worldDimensionsInPartitions, partitionIndex);

          partitions[partitionIndex] = partition;
        }
      }
    }
  }

  function getPartitionCapacity() {
    return partitionCapacity;
  }

  function getPartitions() {
    return partitions;
  }

  function getPartition(partitionIndex) {
    var partition = partitions[partitionIndex];

    partition.initIfRequired();

    return partition;
  }

  var h = Math.random() * partitionDimensionsInBlocks.y * worldDimensionsInPartitions.y;

  function getPartitionByIndex(partitionIndex) {
    var partition = getPartition(partitionIndex);

    partition.setRandomHeight(h);

    return partition;
  }

  function getBlockDimensions() {
    return worldDimensionsInBlocks;
  }

  function getBlock(pos) {
    var px = (pos.x / partitionDimensionsInBlocks.x) | 0;
    var py = (pos.y / partitionDimensionsInBlocks.y) | 0;
    var pz = (pos.z / partitionDimensionsInBlocks.z) | 0;

    var partitionIndex = getPartitionIndex(px, py, pz);
    var partition = getPartition(partitionIndex);

    var rx = pos.x - px * partitionDimensionsInBlocks.x;
    var ry = pos.y - py * partitionDimensionsInBlocks.y;
    var rz = pos.z - pz * partitionDimensionsInBlocks.z;

    //console.log(rx, ry, rz)

    return partition.getBlock(new THREE.Vector3(rx, ry, rz));
  }

  function setBlocks(start, end, type) {
    // TODO: Need to optimise

    var x1 = Math.min(start.x, end.x);
    var x2 = Math.max(start.x, end.x);

    var y1 = Math.min(start.y, end.y);
    var y2 = Math.max(start.y, end.y);

    var z1 = Math.min(start.z, end.z);
    var z2 = Math.max(start.z, end.z);

    var px1 = (x1 / partitionDimensionsInBlocks.x) | 0;
    var py1 = (y1 / partitionDimensionsInBlocks.y) | 0;
    var pz1 = (z1 / partitionDimensionsInBlocks.z) | 0;

    var px2 = (x2 / partitionDimensionsInBlocks.x) | 0;
    var py2 = (y2 / partitionDimensionsInBlocks.y) | 0;
    var pz2 = (z2 / partitionDimensionsInBlocks.z) | 0;

    for (var px = px1; px <= px2; px++) {
      for (var py = py1; py <= py2; py++) {
        for (var pz = pz1; pz <= pz2; pz++) {
          var partitionIndex = getPartitionIndex(px, py, pz);
          var partition = getPartition(partitionIndex);

          for (var z = z1; z <= z2; z++) {
            for (var y = y1; y <= y2; y++) {
              for (var x = x1; x <= x2; x++) {

                if (x >= partition.offset.x && x < partition.offset.x + partitionDimensionsInBlocks.x) {
                  if (y >= partition.offset.y && y < partition.offset.y + partitionDimensionsInBlocks.y) {
                    if (z >= partition.offset.z && z < partition.offset.z + partitionDimensionsInBlocks.z) {
                      partition.setBlock(new THREE.Vector3(x - partition.offset.x, y - partition.offset.y, z - partition.offset.z), type);
                    }
                  }
                }

              }
            }
          }
        }
      }
    }
  }

  function addBlock(index, side, type) {
    var position = getPositionFromIndex(index);

    if (type === 0) {
      return setBlocks(position, position, type);
    }

    console.log('position', position);

    if (side === 0.0) {
      position.x++;
    }
    if (side === 1.0) {
      position.x--;
    }
    if (side === 2.0) {
      position.y++;
    }
    if (side === 3.0) {
      position.y--;
    }
    if (side === 4.0) {
      position.z++;
    }
    if (side === 5.0) {
      position.z--;
    }

    setBlocks(position, position, type);
  }

  function getPartitionIndex(x, y, z) {
    return x + worldDimensionsInPartitions.x * (y + worldDimensionsInPartitions.y * z);
  }

  // TODO: Commonise
  function getPositionFromIndex(index) {
    var z = Math.floor(index / (worldDimensionsInBlocks.x * worldDimensionsInBlocks.y));
    var y = Math.floor((index - z * worldDimensionsInBlocks.x * worldDimensionsInBlocks.y) / worldDimensionsInBlocks.x);
    var x = index - worldDimensionsInBlocks.x * (y + worldDimensionsInBlocks.y * z);

    return new THREE.Vector3(x, y, z);
  }

  function getPartitionBoundaries() {
    var partitionBoundaries = [];

    for (var z = 0; z < worldDimensionsInPartitions.z; z++) {
      for (var y = 0; y < worldDimensionsInPartitions.y; y++) {
        for (var x = 0; x < worldDimensionsInPartitions.x; x++) {
          var partitionIndex = getPartitionIndex(x, y, z);

          var boundaryPoints = [];

          for (var bx = 0; bx < 2; bx++) {
            for (var by = 0; by < 2; by++) {
              for (var bz = 0; bz < 2; bz++) {
                var x1 = partitionDimensionsInBlocks.x * (x + bx);
                var y1 = partitionDimensionsInBlocks.y * (y + by);
                var z1 = partitionDimensionsInBlocks.z * (z + bz);

                boundaryPoints.push(new THREE.Vector3(x1, y1, z1));
              }
            }
          }

          partitionBoundaries.push({ partitionIndex: partitionIndex, points: boundaryPoints });
        }
      }
    }

    return partitionBoundaries;
  }

  function getDirtyPartitions() {
    var dirty = [];

    for (var partitionIndex = 0; partitionIndex < capacity; partitionIndex++) {
      //var partition = getPartition(partitionIndex);
      var partition = partitions[partitionIndex];

      if (partition.isDirty()) {
        dirty.push(partitionIndex);
      }
    }

    return dirty;
  }

  return {
    getBlock: getBlock,
    setBlocks: setBlocks,
    addBlock: addBlock,
    getPartitionCapacity: getPartitionCapacity,
    getPartitions: getPartitions,
    getPartitionByIndex: getPartitionByIndex,
    getBlockDimensions: getBlockDimensions,
    getPartitionBoundaries: getPartitionBoundaries,
    getDirtyPartitions: getDirtyPartitions
  };
}