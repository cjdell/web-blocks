import * as Comlink from 'comlink';

import { IntVector3, WorldInfo } from '../common/WorldInfo';
import { throttle } from '../common/Throttle';
import World from './World';
import WorldGeometry from './WorldGeometry';
import Player from './Player';
import Api from './Api';
import ScriptRunner from './ScriptRunner';
import { Loader } from './Geometry/Loader';

import type { GeometryWorkerApi } from '../common/WorkerProtocol';
import type { BoundScriptsChangeListener, PlayerPositionChangeListener } from '../common/Types';

console.log('GeometryWorker: online');

let world: World;
let worldGeometry: WorldGeometry;
let player: Player;
let scriptApi: Api;
let scriptRunner: ScriptRunner;

// Worker → host event listeners, registered by the host through the on*
// methods below. They arrive as comlink proxies, so invoking one returns a
// Promise that settles when the host handler finishes.
let updateListener: ((changes: number[]) => void) | null = null;
let playerPositionListener: PlayerPositionChangeListener | null = null;
let boundScriptsListener: BoundScriptsChangeListener | null = null;
let printListener: ((message: string) => void) | null = null;

/**
 * Push an event to a registered host listener.
 *
 * Calling a comlink listener proxy returns a Promise that rejects if the
 * host handler throws. Events are fire-and-forget, so a rejected event must
 * not become an unhandled rejection in the worker — log it and move on.
 */
function emit<T extends unknown[]>(listener: ((...args: T) => void) | null, ...args: T): void {
  if (listener) {
    void Promise.resolve(listener(...args)).catch((error: unknown) => {
      console.error('worker event handler failed:', error);
    });
  }
}

const checkForChangedPartitions = throttle(() => {
  emit(updateListener, world.getDirtyPartitions());
}, 100);

// The object the host sees through Comlink.wrap(). It is typed against the
// shared contract, so the compiler checks the implementation against the
// same interface the host's typed proxy is built from.
const workerApi: GeometryWorkerApi = {
  init: () => {
    const worldInfo = new WorldInfo({
      worldDimensionsInPartitions: new IntVector3(32, 1, 32),
      partitionDimensionsInBlocks: new IntVector3(32, 128, 32),
      partitionBoundaries: null,
    });

    world = new World(worldInfo);
    worldGeometry = new WorldGeometry(worldInfo, world);
    player = new Player(world);
    scriptApi = new Api(world, player);
    scriptRunner = new ScriptRunner(scriptApi);

    world.init();

    world.onWorldChanged((_world) => {
      checkForChangedPartitions();
    });

    player.onPlayerPositionChange((args) => {
      emit(playerPositionListener, args);
    });

    player.onBoundScriptsChange((args) => {
      emit(boundScriptsListener, args);
    });

    player.print = (message: string) => {
      emit(printListener, message);
    };

    Loader.Instance = new Loader(worldInfo, world);

    setInterval(() => {
      player.tick();
    }, 1000 / 60);

    // Resolve once the block geometry has loaded, so the host's init()
    // promise is the world's readiness signal.
    return Loader.Instance.init().then(() => worldInfo);
  },

  runScript: (code, expr) => {
    return { result: scriptRunner.run(code, expr) };
  },

  undo: () => {
    world.undo();
  },

  getPartition: (index) => {
    const geo = worldGeometry.getPartitionGeometry(index);

    if (!geo.data.position) {
      throw new Error(`Partition ${index} has no geometry data`);
    }

    // Transfer the typed arrays instead of cloning them: the host receives
    // the live buffers (see VertexData) and can hand them to three.js.
    return Comlink.transfer({ index, geo }, [
      geo.data.position.buffer,
      geo.data.normal.buffer,
      geo.data.uv.buffer,
      geo.data.data.buffer,
      geo.data.offset.buffer,
    ]);
  },

  getBlock: (pos) => {
    const type = world.getBlock(pos.x, pos.y, pos.z);

    return { pos, type };
  },

  setBlocks: (args) => {
    const { start, end, type, colour } = args;

    world.setBlocks(start.x, start.y, start.z, end.x, end.y, end.z, type, colour);
  },

  addBlock: (args) => {
    world.addBlock(args.position, args.side, args.type);
  },

  move: (movement) => {
    player.move(movement);
  },

  jump: () => {
    player.jump();
  },

  setGravity: (gravity) => {
    player.gravity = gravity;
  },

  getMousePosition: () => {
    return player.mousePosition;
  },

  setMousePosition: (position) => {
    player.mousePosition = position;
  },

  rightClick: () => {
    // mouseUp fires twice
    if (!player.rightClicked) {
      player.rightClick();
      player.rightClicked = true;
    } else {
      player.rightClicked = false;
    }
  },

  executeBoundScript: (index) => {
    const fn = player.getBoundScript(index);

    if (fn) {
      fn();
    }
  },

  // ---- Worker → host event registration ----

  onUpdate: (listener) => {
    updateListener = listener;
  },

  onPlayerPositionChange: (listener) => {
    playerPositionListener = listener;
  },

  onBoundScriptsChange: (listener) => {
    boundScriptsListener = listener;
  },

  onPrint: (listener) => {
    printListener = listener;
  },
};

// In a dedicated worker globalThis is the worker scope: comlink listens for
// (and replies on) its message channel.
Comlink.expose(workerApi);
