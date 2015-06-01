'use strict';

console.log('GeometryWorker: online');

self.importScripts('external.js');
self.importScripts('../lib/underscore.js');
self.importScripts('../lib/three.v71.js');

var _ = require('underscore');

var World = require('./World');
var WorldGeometry = require('./WorldGeometry');

var world, worldGeometry;

function init() {
  world = new World(new THREE.Vector3(32, 1, 32), new THREE.Vector3(16, 32, 16));

  worldGeometry = new WorldGeometry(world);

  return self.postMessage({
    action: 'init',
    partitionBoundaries: world.getPartitionBoundaries(),
    partitionCapacity: world.getPartitionCapacity(),
    blockDimensions: world.getBlockDimensions()
  });
}

self.onmessage = function(e) {
  if (e.data.action === 'init') {
    return init();
  }

  if (e.data.action === 'getPartition') {
    var geo = worldGeometry.getPartitionGeometry(e.data.index);

    self.postMessage({
      action: 'getPartition',
      index: e.data.index,
      geo: geo
    }, [
      geo.data.position.buffer,
      geo.data.normal.buffer,
      geo.data.uv.buffer,
      geo.data.data.buffer,
      geo.data.offset.buffer
    ]);
  }

  if (e.data.action === 'getBlock') {
    var type = world.getBlock(e.data.pos);

    self.postMessage({
      action: 'getBlock',
      pos: e.data.pos,
      type: type
    });
  }

  if (e.data.action === 'setBlocks') {
    world.setBlocks(e.data.start, e.data.end, e.data.type, e.data.update);

    if (e.data.update) checkForChangedPartitions();
  }

  if (e.data.action === 'addBlock') {
    world.addBlock(e.data.position, e.data.side, e.data.type);

    checkForChangedPartitions();
  }
};

var checkForChangedPartitions = _.debounce(function() {
  var dirty = world.getDirtyPartitions();

  console.log('checkForChangedPartitions', dirty.length, dirty);

  self.postMessage({
    action: 'update',
    changes: dirty
  });
}, 250);
