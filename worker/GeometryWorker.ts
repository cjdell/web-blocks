/// <reference path="../typings/index.d.ts" />
// The DOM lib types `self` as a Window (whose postMessage requires a
// targetOrigin); the real geometry-worker global is a Worker scope.
const _self = self as unknown as Worker;

import { IntVector3, WorldInfo } from '../common/WorldInfo';
import { throttle }              from '../common/Throttle';
import World                     from './World';
import WorldGeometry             from './WorldGeometry';
import Player                    from './Player';
import Api                       from './Api';
import ScriptRunner              from './ScriptRunner';
import { Loader }                from './Geometry/Loader';

import type {
  RequestFor,
  WorkerRequest
} from '../common/WorkerProtocol';

console.log('GeometryWorker: online');

let world: World;
let worldGeometry: WorldGeometry;
let player: Player;
let api: Api;
let scriptRunner: ScriptRunner;

const checkForChangedPartitions = throttle(() => {
  const dirty = world.getDirtyPartitions();

  _self.postMessage({
    action: 'update',
    changes: dirty
  });
}, 100);

const init = (invocation: RequestFor<'init'>): void => {
  const worldInfo = new WorldInfo({
    worldDimensionsInPartitions: new IntVector3(32, 1, 32),
    partitionDimensionsInBlocks: new IntVector3(32, 128, 32),
    partitionBoundaries: null
  });

  world = new World(worldInfo);
  worldGeometry = new WorldGeometry(worldInfo, world);
  player = new Player(world);
  api = new Api(world, player);
  scriptRunner = new ScriptRunner(api);

  world.init();

  world.onWorldChanged(_world => {
    checkForChangedPartitions();
  });

  player.onPlayerPositionChange(args => {
    _self.postMessage({
      action: 'playerPositionChange',
      data: args
    });
  });

  player.onBoundScriptsChange(args => {
    _self.postMessage({
      action: 'boundScriptsChange',
      data: args
    });
  });

  player.print = (msg: string) => {
    _self.postMessage({
      action: 'print',
      data: msg
    });
  };

  Loader.Instance = new Loader(worldInfo);

  Loader.Instance.init().then(() => {
    return _self.postMessage({
      id: invocation.id,
      data: worldInfo
    });
  });

  setInterval(() => {
    player.tick();
  }, 1000 / 60);
};

const runScript = (invocation: RequestFor<'runScript'>): void => {
  const result = scriptRunner.run(invocation.data.code, invocation.data.expr);

  _self.postMessage({
    id: invocation.id,
    data: { result }
  });
};

const undo = (invocation: RequestFor<'undo'>): void => {
  world.undo();

  _self.postMessage({
    id: invocation.id,
    data: {}
  });
};

const getPartition = (invocation: RequestFor<'getPartition'>): void => {
  const geo = worldGeometry.getPartitionGeometry(invocation.data.index);

  if (!geo.data.position) {
    console.warn('Partition', invocation.data.index, 'no data');
    return;
  }

  _self.postMessage(
    {
      id: invocation.id,
      data: {
        index: invocation.data.index,
        geo
      }
    }, [
      geo.data.position.buffer,
      geo.data.normal.buffer,
      geo.data.uv.buffer,
      geo.data.data.buffer,
      geo.data.offset.buffer
    ]
  );
};

const getBlock = (invocation: RequestFor<'getBlock'>): void => {
  const { x, y, z } = invocation.data.pos;

  const type = world.getBlock(x, y, z);

  _self.postMessage({
    id: invocation.id,
    data: {
      pos: invocation.data.pos,
      type
    }
  });
};

const setBlocks = (invocation: RequestFor<'setBlocks'>): void => {
  const { start, end, type, colour } = invocation.data;

  world.setBlocks(start.x, start.y, start.z, end.x, end.y, end.z, type, colour);
};

const addBlock = (invocation: RequestFor<'addBlock'>): void => {
  world.addBlock(invocation.data.position, invocation.data.side, invocation.data.type);
};

const move = (invocation: RequestFor<'move'>): void => {
  player.move(invocation.data);
};

const action = (): void => {
  // The only action payload is { action: 'jump' }; the worker treats every
  // 'action' request as a jump.
  player.jump();
};

const setGravity = (invocation: RequestFor<'setGravity'>): void => {
  player.gravity = invocation.data.gravity;
};

const getMousePosition = () => {
  return player.mousePosition;
};

const setMousePosition = (invocation: RequestFor<'setMousePosition'>): void => {
  player.mousePosition = invocation.data;
};

const rightClick = () => {
  // mouseUp fires twice
  if (!player.rightClicked) {
    player.rightClick();
    player.rightClicked = true;
  } else {
    player.rightClicked = false;
  }
};

const executeBoundScript = (invocation: RequestFor<'executeBoundScript'>): void => {
  const fn = player.getBoundScript(invocation.data.index);

  if (fn) {
    fn();
  }
};

self.onmessage = (e: MessageEvent) => {
  const invocation = e.data as WorkerRequest;

  switch (invocation.action) {
    case 'init':
      return init(invocation);
    case 'runScript':
      return runScript(invocation);
    case 'undo':
      return undo(invocation);
    case 'getPartition':
      return getPartition(invocation);
    case 'getBlock':
      return getBlock(invocation);
    case 'setBlocks':
      return setBlocks(invocation);
    case 'addBlock':
      return addBlock(invocation);
    case 'move':
      return move(invocation);
    case 'action':
      return action();
    case 'setGravity':
      return setGravity(invocation);
    case 'getMousePosition':
      return getMousePosition();
    case 'setMousePosition':
      return setMousePosition(invocation);
    case 'rightClick':
      return rightClick();
    case 'executeBoundScript':
      return executeBoundScript(invocation);
  }
};
