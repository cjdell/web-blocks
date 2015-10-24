/// <reference path="../typings/tsd.d.ts" />
'use strict';
const win = <any>self;

import _ = require('underscore');
import THREE = require('three');

import com from '../common/WorldInfo';
import World from './World';
import WorldGeometry from './WorldGeometry';
import Player from './Player';
import Api from './Api';
import ScriptRunner from './ScriptRunner';

import { Loader } from './Geometry/Loader';

console.log('GeometryWorker: online');

let world: World;
let worldGeometry: WorldGeometry;
let player: Player;
let api: Api;
let scriptRunner: ScriptRunner;

interface Invocation<DataType> {
  id: number;
  action: string;
  data: DataType;
}

function init(invocation: Invocation<void>): void {
  const worldInfo = new com.WorldInfo({
    worldDimensionsInPartitions: new com.IntVector3(32, 1, 32),
    partitionDimensionsInBlocks: new com.IntVector3(32, 32, 32),
    partitionBoundaries: null
  });

  world = new World(worldInfo);

  world.init();

  worldGeometry = new WorldGeometry(worldInfo, world);

  player = new Player();

  api = new Api(world, player);

  scriptRunner = new ScriptRunner(api);

  player.changeListener = (position: THREE.Vector3, target: THREE.Vector3) => {
    win.postMessage({
      action: 'updatePlayerPosition',
      data: {
        position: position,
        target: target
      }
    });
  };

  Loader.Instance = new Loader(worldInfo);

  Loader.Instance.init().then(() => {
    return win.postMessage({
      id: invocation.id,
      data: worldInfo
    });
  });
}

function setPlayerPosition(invocation: Invocation<{ position: THREE.Vector3, target: THREE.Vector3 }>) {
  player.update(invocation.data.position, invocation.data.target);
}

function runScript(invocation: Invocation<{ code: string, expr: boolean }>) {
  const result = scriptRunner.run(invocation.data.code, invocation.data.expr);

  win.postMessage({
    id: invocation.id,
    data: {
      result: result
    }
  });

  checkForChangedPartitions();
}

function undo(invocation: Invocation<void>) {
  world.undo();

  checkForChangedPartitions();

  win.postMessage({
    id: invocation.id,
    data: {}
  });
}

function getPartition(invocation: Invocation<{ index: number }>) {
  const geo = worldGeometry.getPartitionGeometry(invocation.data.index);

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

function getBlock(invocation: Invocation<{ pos: com.IntVector3 }>) {
  const type = world.getBlock(invocation.data.pos.x, invocation.data.pos.y, invocation.data.pos.z);

  win.postMessage({
    id: invocation.id,
    data: {
      pos: invocation.data.pos,
      type: type
    }
  });
}

function setBlocks(invocation: Invocation<{ start: com.IntVector3, end: com.IntVector3, type: number, colour: number, update: boolean }>) {
  const start = invocation.data.start;
  const end = invocation.data.end;

  world.setBlocks(start.x, start.y, start.z, end.x, end.y, end.z, invocation.data.type, invocation.data.colour);

  if (invocation.data.update) checkForChangedPartitions();
}

function addBlock(invocation: Invocation<{ position: number, side: number, type: number }>) {
  world.addBlock(invocation.data.position, invocation.data.side, invocation.data.type);

  checkForChangedPartitions();
}

self.onmessage = function(e) {
  const invocation = <Invocation<void>>e.data;

  if (invocation.action === 'init') {
    return init(invocation);
  }

  if (invocation.action === 'setPlayerPosition') {
    const invocation = <Invocation<{ position: THREE.Vector3, target: THREE.Vector3 }>>e.data;

    return setPlayerPosition(invocation);
  }

  if (invocation.action === 'runScript') {
    const invocation = <Invocation<{ code: string, expr: boolean }>>e.data;

    return runScript(invocation);
  }

  if (invocation.action === 'undo') {
    return undo(invocation);
  }

  if (invocation.action === 'getPartition') {
    const invocation = <Invocation<{ index: number }>>e.data;

    return getPartition(invocation);
  }

  if (invocation.action === 'getBlock') {
    const invocation = <Invocation<{ pos: com.IntVector3 }>>e.data;

    return getBlock(invocation);
  }

  if (invocation.action === 'setBlocks') {
    const invocation = <Invocation<{ start: com.IntVector3, end: com.IntVector3, type: number, colour: number, update: boolean }>>e.data;

    return setBlocks(invocation);
  }

  if (invocation.action === 'addBlock') {
    const invocation = <Invocation<{ position: number, side: number, type: number }>>e.data;

    return addBlock(invocation);
  }
};

var checkForChangedPartitions = _.debounce(function() {
  const dirty = world.getDirtyPartitions();

  win.postMessage({
    action: 'update',
    changes: dirty
  });
}, 20);
