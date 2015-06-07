var ImprovedNoise = require('./ImprovedNoise');

function Partition(dimensions, partitionPosition, worldDimensions, partitionIndex) {
  //console.log(partitionPosition.x, partitionPosition.z);

  var capacity = dimensions.x * dimensions.y * dimensions.z;
  var offset = new THREE.Vector3(partitionPosition.x * dimensions.x, partitionPosition.y * dimensions.y, partitionPosition.z * dimensions.z);
  var blocks = null;
  var dirty = false;
  var occupied = 0;   // Total of everything that isn't air

  var VALUES_PER_BLOCK = 2;

  function initIfRequired() {
    if (blocks === null) {
      blocks = new Uint8Array(capacity * 2);
    }
  }

  function getBlock(position) {
    var index = getIndex(position.x, position.y, position.z);

    return new Uint8Array([blocks[VALUES_PER_BLOCK * index]]);
  }

  function setBlockWithIndex(index, type, colour) {
    var offset = VALUES_PER_BLOCK * index;

    var currentType = blocks[offset + 0];

    if (currentType === type) return;

    blocks[offset + 0] = type;
    blocks[offset + 1] = colour | 0;

    if (currentType === 0)
      occupied += 1;
    else if (type === 0)
      occupied -= 1;

    dirty = true;
  }

  function setBlock(position, type, colour) {
    setBlockWithIndex(getIndex(position.x, position.y, position.z), type, colour);
  }

  function setBlocks(start, end, type) {
    for (var z = start.z; z <= end.z; z++) {
      for (var y = start.y; y <= end.y; y++) {
        var index = getIndex(start.x, y, z);
        for (var x = start.x; x <= end.x; x++, index++) {
          setBlockWithIndex(index, type);
        }
      }
    }
  }

  function getIndex(x, y, z) {
    return x + dimensions.x * (y + dimensions.y * z);
  }

  function getPositionFromIndex(index) {
    var z = Math.floor(index / (dimensions.x * dimensions.y));
    var y = Math.floor((index - z * dimensions.x * dimensions.y) / dimensions.x);
    var x = index - dimensions.x * (y + dimensions.y * z);

    return new THREE.Vector3(x, y, z);
  }

  function canBlockBeSeen(index) {
    var pos = getPositionFromIndex(index);

    if (pos.x === 0 || pos.y === 0 || pos.z === 0) return true;
    if (pos.x === dimensions.x - 1 || pos.y === dimensions.y - 1 || pos.z === dimensions.z - 1) return true;

    var xdi = index - 1;
    var xui = index + 1;

    var ydi = index - dimensions.x;
    var yui = index + dimensions.x;

    var zdi = index - (dimensions.x * dimensions.y);
    var zui = index + (dimensions.x * dimensions.y);

    var xd = blocks[VALUES_PER_BLOCK * xdi];
    var xu = blocks[VALUES_PER_BLOCK * xui];

    var yd = blocks[VALUES_PER_BLOCK * ydi];
    var yu = blocks[VALUES_PER_BLOCK * yui];

    var zd = blocks[VALUES_PER_BLOCK * zdi];
    var zu = blocks[VALUES_PER_BLOCK * zui];

    return !(xd && xu && yd && yu && zd && zu);
  }

  function getWorldIndexFromWorldPosition(x, y, z) {
    return x + (worldDimensions.x * dimensions.x) * (y + (worldDimensions.y * dimensions.y) * z);
  }

  function getBlockIndexInWorld(blockIndex) {
    var position = getPositionFromIndex(blockIndex);

    position.x += offset.x;
    position.y += offset.y;
    position.z += offset.z;

    return getWorldIndexFromWorldPosition(position.x, position.y, position.z);
  }

  function setRandomHeight(h) {
    //console.time('setRandomHeight');

    var width = dimensions.x, height = dimensions.z;

    var data = [];
    var perlin = new ImprovedNoise();
    var size = width * height;
    var quality = 1;
    //var h = Math.random() * dimensions.y;

    for (var j = 0; j < 4; j++) {
      if (j == 0) for (var i = 0; i < size; i++) data[i] = 0;

      var index = 0;

      for (var x = offset.x; x < offset.x + width; x++) {
        for (var z = offset.z; z < offset.z + height; z++, index++) {
          data[index] += perlin.noise(x / quality, z / quality, h) * quality;
        }
      }

      quality *= 4;
    }

    var index2 = 0;

    for (var x2 = 0; x2 < width; x2++) {
      for (var z2 = 0; z2 < height; z2++, index2++) {
        var y2 = Math.min(Math.abs(data[index2] * 0.2), dimensions.y) | 0;

        if (y2 >= 1) {
          setBlocks(new THREE.Vector3(x2, 0, z2), new THREE.Vector3(x2, y2, z2), 2);
        } else {
          setBlocks(new THREE.Vector3(x2, 1, z2), new THREE.Vector3(x2, 1, z2), 3);
        }
      }
    }

    //console.timeEnd('setRandomHeight');

    return data;
  }

  function isDirty() {
    return dirty;
  }

  function getVisibleBlocks() {
    //console.time('getVisibleBlocks');

    var valuesPerBlock = 6;

    updateHeightMap();

    var id = 0;
    var changes = new Int32Array(occupied * valuesPerBlock);

    for (var index = 0; index < capacity; index++) {
      var offset = VALUES_PER_BLOCK * index;

      var type = blocks[offset + 0];
      var colour = blocks[offset + 1];

      if (type !== 0 && canBlockBeSeen(index)) {
        var pos = getPositionFromIndex(index);

        var shade = computeOcclusion(pos) * 16;

        changes[id * valuesPerBlock + 0] = id;
        changes[id * valuesPerBlock + 1] = index;
        changes[id * valuesPerBlock + 2] = getBlockIndexInWorld(index);
        changes[id * valuesPerBlock + 3] = type;
        changes[id * valuesPerBlock + 4] = shade;
        changes[id * valuesPerBlock + 5] = colour;

        id += 1;
      }
    }

    dirty = false;

    //console.timeEnd('getVisibleBlocks');

    return { blocks: changes, maxId: id - 1 };
  }

  var heightMap = new Uint8Array(dimensions.x * dimensions.z);

  function computeOcclusion(pos) {
    var pindex = pos.z * dimensions.x + pos.x;

    if (heightMap[pindex] > pos.y) return 8;

    var combinedHeight = 0;

    for (var z = pos.z - 2; z <= pos.z + 2; z++) {
      for (var x = pos.x - 2; x <= pos.x + 2; x++) {
        // TODO: Need to peek height map from adjacent partitions
        if (x < 0) continue;
        if (z < 0) continue;
        if (x > dimensions.x - 1) continue;
        if (z > dimensions.z - 1) continue;

        var r = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.z - z, 2));

        var index = z * dimensions.x + x;

        var height = heightMap[index] - pos.y;

        if (height > 0) combinedHeight += height / (r * r);
      }
    }

    return Math.min(combinedHeight, 8);
  }

  function updateHeightMap() {
    for (var z = 0; z < dimensions.z; z++) {
      for (var x = 0; x < dimensions.x; x++) {
        var index = z * dimensions.x + x;

        heightMap[index] = getHighestPoint(x, z);
      }
    }
  }

  function getHighestPoint(x, z) {
    for (var y = dimensions.y - 1; y >= 0; y--) {
      var index = getIndex(x, y, z);

      if (blocks[VALUES_PER_BLOCK * index] !== 0) return y;
    }

    return 0;
  }

  return {
    dimensions: dimensions,
    position: partitionPosition,
    index: partitionIndex,
    offset: offset,
    capacity: capacity,
    initIfRequired: initIfRequired,
    getBlock: getBlock,
    setBlock: setBlock,
    setRandomHeight: setRandomHeight,
    isDirty: isDirty,
    getVisibleBlocks: getVisibleBlocks
  };
}

module.exports = Partition;
