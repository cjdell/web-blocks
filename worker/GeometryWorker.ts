/// <reference path="../typings/index.d.ts" />
const _self = <any>self;

import { IntVector3, WorldInfo } from '../common/WorldInfo';
import { throttle }   from '../common/Throttle';
import World          from './World';
import WorldGeometry  from './WorldGeometry';
import Player         from './Player';
import Api            from './Api';
import ScriptRunner   from './ScriptRunner';
import { Loader }     from './Geometry/Loader';

import {
  Movement,
  AddBlockArgs,
  SetBlocksArgs
} from '../common/Types';

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

const checkForChangedPartitions = throttle(() => {
  const dirty = world.getDirtyPartitions();

  _self.postMessage({
    action: 'update',
    changes: dirty
  });
}, 100);

const init = (invocation: Invocation<void>): void => {
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

const runScript = (invocation: Invocation<{ code: string, expr: boolean }>) => {
  const result = scriptRunner.run(invocation.data.code, invocation.data.expr);

  _self.postMessage({
    id: invocation.id,
    data: { result }
  });
};

const undo = (invocation: Invocation<void>) => {
  world.undo();

  _self.postMessage({
    id: invocation.id,
    data: {}
  });
};

const getPartition = (invocation: Invocation<{ index: number }>) => {
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

const getBlock = (invocation: Invocation<{ pos: IntVector3 }>) => {
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

const setBlocks = (invocation: Invocation<SetBlocksArgs>) => {
  const { start, end, type, colour } = invocation.data;

  world.setBlocks(start.x, start.y, start.z, end.x, end.y, end.z, type, colour);
};

const addBlock = (invocation: Invocation<AddBlockArgs>) => {
  world.addBlock(invocation.data.position, invocation.data.side, invocation.data.type);
};

const move = (invocation: Invocation<Movement>) => {
  player.move(invocation.data);
};

const action = (_invocation: Invocation<{ type: string }>) => {
  player.jump();
};

const setGravity = (invocation: Invocation<{ gravity: number }>) => {
  player.gravity = invocation.data.gravity;
};

const getMousePosition = () => {
  return player.mousePosition;
};

const setMousePosition = (invocation: Invocation<{ pos: IntVector3, side: number }>) => {
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

const executeBoundScript = (invocation: Invocation<{ index: number }>) => {
  const fn = player.getBoundScript(invocation.data.index);

  if (fn) {
    fn();
  }
};

self.onmessage = (e) => {
  const invocation = e.data as Invocation<void>;

  if (invocation.action === 'init') {
    return init(invocation);
  }

  if (invocation.action === 'runScript') {
    return runScript(e.data as Invocation<{ code: string, expr: boolean }>);
  }

  if (invocation.action === 'undo') {
    return undo(invocation);
  }

  if (invocation.action === 'getPartition') {
    return getPartition(e.data as Invocation<{ index: number }>);
  }

  if (invocation.action === 'getBlock') {
    return getBlock(e.data as Invocation<{ pos: IntVector3 }>);
  }

  if (invocation.action === 'setBlocks') {
    return setBlocks(e.data as Invocation<SetBlocksArgs>);
  }

  if (invocation.action === 'addBlock') {
    return addBlock(e.data as Invocation<AddBlockArgs>);
  }

  if (invocation.action === 'move') {
    return move(e.data as Invocation<Movement>);
  }

  if (invocation.action === 'action') {
    return action(e.data as Invocation<{ type: string }>);
  }

  if (invocation.action === 'setGravity') {
    return setGravity(e.data as Invocation<{ gravity: number }>);
  }

  if (invocation.action === 'getMousePosition') {
    return getMousePosition();
  }

  if (invocation.action === 'setMousePosition') {
    return setMousePosition(e.data as Invocation<{ pos: IntVector3, side: number }>);
  }

  if (invocation.action === 'rightClick') {
    return rightClick();
  }

  if (invocation.action === 'executeBoundScript') {
    return executeBoundScript(e.data as Invocation<{ index: number }>);
  }
};
