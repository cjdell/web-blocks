'use strict';

console.log('GeometryWorker: online');

self.importScripts('external.js');
self.importScripts('../lib/underscore.js');
self.importScripts('../lib/three.v71.js');

var _ = require('underscore');

var World = require('./World').default.NewWorld;
var WorldGeometry = require('./WorldGeometry');

var world, worldGeometry;

function init(invocation) {
  world = new World(new THREE.Vector3(32, 1, 32), new THREE.Vector3(16, 32, 16));
  
  world.init();

  worldGeometry = new WorldGeometry(world);

  return self.postMessage({
    id: invocation.id,
    data: {
      partitionBoundaries: world.getPartitionBoundaries(),
      partitionCapacity: world.getPartitionCapacity(),
      blockDimensions: world.getBlockDimensions()
    }
  });
}

self.onmessage = function(e) {
  if (e.data.action === 'init') {
    return init(e.data);
  }

  if (e.data.action === 'getPartition') {
    var geo = worldGeometry.getPartitionGeometry(e.data.data.index);

    self.postMessage({
      id: e.data.id,
      data: {
        index: e.data.data.index,
        geo: geo
      }
    }, [
      geo.data.position.buffer,
      geo.data.normal.buffer,
      geo.data.uv.buffer,
      geo.data.data.buffer,
      geo.data.offset.buffer
    ]);
  }

  if (e.data.action === 'getBlock') {
    var type = world.getBlock(e.data.data.pos);

    self.postMessage({
      id: e.data.id,
      data: {
        pos: e.data.data.pos,
        type: type
      }
    });
  }

  if (e.data.action === 'setBlocks') {
    world.setBlocks(e.data.data.start, e.data.data.end, e.data.data.type, e.data.data.colour);

    if (e.data.data.update) checkForChangedPartitions();
  }

  if (e.data.action === 'addBlock') {
    world.addBlock(e.data.data.position, e.data.data.side, e.data.data.type);

    checkForChangedPartitions();
  }
};

var checkForChangedPartitions = _.debounce(function() {
  var dirty = world.getDirtyPartitions();

  self.postMessage({
    action: 'update',
    changes: dirty
  });
}, 20);
