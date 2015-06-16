/// <reference path="../typings/tsd.d.ts" />
'use strict';

let win = <any>self;
win.importScripts('external.js');

import _ = require('underscore');
import THREE = require('three');

import w from './World';
import wg from './WorldGeometry';
import com from './Common';

console.log('GeometryWorker: online');

let world: w.World;
let worldGeometry: wg.WorldGeometry;

interface Invocation {
  id: number;
  action: string;
  data: any;
}

function init(invocation: Invocation): void {
  let worldInfo: com.WorldInfo = {
    worldDimensionsInPartitions: new THREE.Vector3(32, 1, 32),
    partitionDimensionsInBlocks: new THREE.Vector3(16, 32, 16)
  };

  world = w.NewWorld(worldInfo);

  world.init();

  worldGeometry = wg.NewWorldGeometry(world);

  return win.postMessage({
    id: invocation.id,
    data: {
      partitionBoundaries: world.getPartitionBoundaries(),
      partitionCapacity: world.getPartitionCapacity(),
      blockDimensions: world.getBlockDimensions()
    }
  });
}

self.onmessage = function(e) {
  let invocation = <Invocation>e.data;

  if (invocation.action === 'init') {
    return init(invocation);
  }

  if (invocation.action === 'undo') {
    world.undo();

    checkForChangedPartitions();

    win.postMessage({
      id: invocation.id,
      data: {}
    });
  }

  if (invocation.action === 'getPartition') {
    let geo = worldGeometry.getPartitionGeometry(invocation.data.index);

    win.postMessage({
      id: invocation.id,
      data: {
        index: invocation.data.index,
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

  if (invocation.action === 'getBlock') {
    let type = world.getBlock(invocation.data.pos);

    win.postMessage({
      id: invocation.id,
      data: {
        pos: invocation.data.pos,
        type: type
      }
    });
  }

  if (invocation.action === 'setBlocks') {
    let start = new THREE.Vector3(invocation.data.start.x, invocation.data.start.y, invocation.data.start.z);
    let end = new THREE.Vector3(invocation.data.end.x, invocation.data.end.y, invocation.data.end.z);

    world.setBlocks(start, end, invocation.data.type, invocation.data.colour);

    if (invocation.data.update) checkForChangedPartitions();
  }

  if (invocation.action === 'addBlock') {
    world.addBlock(invocation.data.position, invocation.data.side, invocation.data.type);

    checkForChangedPartitions();
  }
};

var checkForChangedPartitions = _.debounce(function() {
  let dirty = world.getDirtyPartitions();

  win.postMessage({
    action: 'update',
    changes: dirty
  });
}, 20);
