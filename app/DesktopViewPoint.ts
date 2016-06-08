import HTML = Mocha.reporters.HTML;
"use strict";
/// <reference path="../typings/tsd.d.ts" />
import _ = require('underscore');
import THREE = require('three');

import com from '../common/WorldInfo';
import WorkerInterface from './WorkerInterface';
import { Movement } from '../common/Types';

export default class DesktopViewPoint {
  private camera: THREE.PerspectiveCamera;
  private light: THREE.Light;
  private viewPort: HTMLDivElement;
  private renderer: THREE.Renderer;
  private scene: THREE.Scene;
  private worldInfo: com.WorldInfo;
  private workerInterface: WorkerInterface;

  private lastMousePosition: THREE.Vector2;
  private mouseStop: boolean;
  private mouseMovesScreen: boolean;
  private pointerLock: boolean;
  private trusted: boolean;

  private position: THREE.Vector3;
  private movement: Movement;

  private enterDown: boolean;
  private miniConsole: {
    shown: boolean,
    input: HTMLInputElement,
    output: HTMLUListElement,
    outputCount: number,
    hider: NodeJS.Timer,
    history: Array<string>,
    historyIndex: number,
    currentText: string
  };

  constructor(camera: THREE.PerspectiveCamera, light: THREE.Light, viewPort: HTMLDivElement, renderer: THREE.Renderer, scene: THREE.Scene, worldInfo: com.WorldInfo, workerInterface: WorkerInterface) {
    this.camera = camera;
    this.light = light;
    this.viewPort = viewPort;
    this.renderer = renderer;
    this.scene = scene;
    this.worldInfo = worldInfo;
    this.workerInterface = workerInterface;

    this.mouseStop = false;
    this.lastMousePosition = new THREE.Vector2();
    this.mouseMovesScreen = false;

    this.position = new THREE.Vector3(100, 24, 120);
    this.movement = { move: new THREE.Vector3(), turn: new THREE.Vector2 };
    this.pointerLock = false;
    this.trusted = false;

    this.enterDown = false;
    this.miniConsole = {
      shown: false,
      input: <HTMLInputElement>document.querySelector('.miniConsoleInput'),
      output: <HTMLUListElement>document.querySelector('.miniConsoleOutput ul'),
      outputCount: 0,
      hider: null,
      history: [],
      historyIndex: -1,
      currentText: ""
    };


    window.addEventListener('resize', _.debounce(() => this.onWindowResize(), 500), false);

    document.addEventListener('keydown', (e: any) => this.keyDown(e), false);
    document.addEventListener('keyup', (e: any) => this.keyUp(e), false);

    document.addEventListener('pointerlockchange', (e: any) => this.onPointerLockChange(e), false);
    this.viewPort.addEventListener("mousemove", (e: any) => this.mouseMove(e), false);

    document.addEventListener('visibilitychange', (e: any) => this.refreshPointerLock(), false);

    this.workerInterface.playerPositionListener = this.onPlayerPositionChanged.bind(this);
    this.workerInterface.print = this.addMiniConsoleOutput.bind(this);
  }

  onPointerLockChange(event: any) {
    this.trusted = event.isTrusted;
  }

  handlePointerLock() {
    if (!document.pointerLockElement) {
      this.viewPort.requestPointerLock();
      this.pointerLock = true;
    } else if (this.trusted) {
      document.exitPointerLock();
      this.pointerLock = false;
    }
  }

  onWindowResize() {
    const width = this.viewPort.clientWidth, height = this.viewPort.clientHeight;

    console.log('onWindowResize', width, height);

    if (this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
    }
  }

  keyDown(event: any) {

    this.handleTabKey(event);
    this.handleMiniConsole(event);
    if ((<any>window).blockMovement) return;

    if (event.keyCode === 65) this.movement.move.x = 1;        // A (Left)
    if (event.keyCode === 68) this.movement.move.x = -1;       // D (Right)

    if (event.keyCode === 87) this.movement.move.z = 1;        // W (Forwards)
    if (event.keyCode === 83) this.movement.move.z = -1;       // S (Backwards)

    if (event.keyCode === 38) this.movement.turn.y = -1;           // Up Arrow (Turn Up)
    if (event.keyCode === 40) this.movement.turn.y = 1;            // Down Arrow (Turn Down)

    if (event.keyCode === 37) this.movement.turn.x = 1;            // Left Arrow (Turn Left)
    if (event.keyCode === 39) this.movement.turn.x = -1;           // Right Arrow (Turn Right)

    if (event.shiftKey) this.handlePointerLock();

    if (event.keyCode === 32 && !this.workerInterface.jumping) this.workerInterface.jump();

    this.workerInterface.move(this.movement);
  }

  keyUp(event: any) {
    if (event.keyCode === 65) this.movement.move.x = 0;        // A (Left)
    if (event.keyCode === 68) this.movement.move.x = 0;        // D (Right)

    if (event.keyCode === 87) this.movement.move.z = 0;        // W (Forwards)
    if (event.keyCode === 83) this.movement.move.z = 0;        // S (Backwards)

    if (event.keyCode === 38) this.movement.turn.y = 0;            // Up Arrow (Turn Up)
    if (event.keyCode === 40) this.movement.turn.y = 0;            // Down Arrow (Turn Down)

    if (event.keyCode === 37) this.movement.turn.x = 0;            // Left Arrow (Turn Left)
    if (event.keyCode === 39) this.movement.turn.x = 0;            // Right Arrow (Turn Right)

    if (event.keyCode === 13) this.enterDown = false;

    if (event.keyCode === 32) this.workerInterface.jumping = false;

    if (event.keyCode === 27) this.refreshPointerLock();

    this.workerInterface.move(this.movement);
  }

  mouseMove(event: any) {
    if (((<any>window).blockMovement && !this.miniConsole.shown)
      || !this.pointerLock || !this.trusted || !document.pointerLockElement) {
      return;
    }

    this.movement.turn.x = 100 * (-event.movementX) / event.srcElement.clientWidth;
    this.movement.turn.y = 100 * (event.movementY) / event.srcElement.clientHeight;

    this.workerInterface.move({ move: this.movement.move, turn: this.movement.turn });

    if (!this.mouseStop) {
      this.mouseStop = true;
      setTimeout(() => {
        this.movement.turn.x = 0;
        this.movement.turn.y = 0;
        this.workerInterface.move({ move: this.movement.move, turn: this.movement.turn });
        this.mouseStop = false;
      }, 10);
    }

    return false;
  }

  tick() {
    //this.workerInterface.move(this.movement, this.turn);
  }

  onPlayerPositionChanged(player: { position: THREE.Vector3, target: THREE.Vector3 }) {
    const PLAYER_HEIGHT = 1.0;

    player.position.y += PLAYER_HEIGHT;
    player.target.y += PLAYER_HEIGHT;

    this.position = player.position;

    this.camera.position.set(player.position.x, player.position.y, player.position.z);
    this.camera.lookAt(player.target);

    this.light.position.set(player.position.x, player.position.y, player.position.z);

    // this.dot(player.position, 0x0000ff);
    // this.dot(player.target, 0xff0000);
  }

  dot(pos: THREE.Vector3, colour: number) {
    // console.log(pos);

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: colour });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
    this.scene.add(cube);
  }

  getPosition() {
    return this.position;
  }

  setPosition(pos: THREE.Vector3) {
    this.position.set(pos.x, pos.y, pos.z);
  }

  refreshPointerLock() {
    if (document.visibilityState == "hidden") {
      this.pointerLock = false;
    }

    if (!(<any>window).blockMovement
      && this.viewPort
      && this.pointerLock
      && this.trusted) {
      this.viewPort.requestPointerLock();
    }
  }

  handleTabKey(event: any) {
    if (event.keyCode == 9 || event.which == 9) {
      event.preventDefault();
      if ((<any>window).blockMovement) {
        if (document.activeElement instanceof HTMLTextAreaElement) {
          var event: any = document.createEvent('TextEvent');
          event.initTextEvent('textInput', true, true, null, "  ", 9, "en-US");
          (<HTMLTextAreaElement>document.activeElement).dispatchEvent(event);
        }
      }
    }
  }

  handleMiniConsole(event: any) {
    if (event.keyCode === 13 && !this.enterDown) {
      this.enterDown = true;
      this.miniConsoleToggle();
    }

    if (this.miniConsole.shown) {
      // Up Arrow
      if (event.keyCode === 38 || event.keyCode === 40) event.preventDefault();
      if (event.keyCode === 38 && this.miniConsole.history.length > this.miniConsole.historyIndex + 1) {
        if (this.miniConsole.historyIndex == -1) {
          this.miniConsole.currentText = this.miniConsole.input.value;
        }
        this.miniConsole.input.value = this.miniConsole.history[++this.miniConsole.historyIndex];
      }
      // Down Arrow
      if (event.keyCode === 40 && this.miniConsole.historyIndex >= 0) {
        this.miniConsole.historyIndex--;
        if (this.miniConsole.historyIndex == -1) {
          this.miniConsole.input.value = this.miniConsole.currentText;
        } else if (this.miniConsole.historyIndex >= 0) {
          this.miniConsole.input.value = this.miniConsole.history[this.miniConsole.historyIndex];
        }
      }
    }
  }

  miniConsoleToggle() {
    if ((<any>window).blockMovement && !this.miniConsole.shown) {
      return;
    }
    this.miniConsole.input.style.display = this.miniConsole.shown ? "none" : "block";
    if (!this.miniConsole.shown) {
      // If we hit enter and it was hidden
      // Clear any impending hides
      if (this.miniConsole.hider) {
        clearTimeout(this.miniConsole.hider);
      }
      this.miniConsole.output.style.display = "block";
      this.miniConsole.input.focus();
      (<any>window).blockMovement = true;
      this.miniConsole.shown = true;
    } else {
      // If we hit enter and it was on-screen
      var script = this.miniConsole.input.value;
      this.miniConsole.input.value = "";
      this.miniConsole.input.blur();
      (<any>window).blockMovement = false;
      this.miniConsole.shown = false;
      if (script.length > 0) {
        this.miniConsole.history.unshift(script);
        const res = this.workerInterface.runScript(script, true);
        if (res instanceof Promise) {
          return res.then((res: any) => {
            this.addMiniConsoleOutput(res.result);
            console.log(res.result);
          });
        }
      } else {
        this.miniConsole.output.style.display = "none";
      }
    }
  }

  addMiniConsoleOutput(result: string) {
    if (!result || result === "") return;
    var line = document.createElement("li");
    line.innerText = result;
    this.miniConsole.output.appendChild(line);
    // Hide output after 5 seconds
    if (this.miniConsole.hider) {
      clearTimeout(this.miniConsole.hider);
    }
    this.miniConsole.hider = setTimeout(() => {
      this.miniConsole.output.style.display = "none";
    }, 5000);
    // If we have more than 6 outputs, remove the top one
    if (this.miniConsole.outputCount++ > 5) {
      var oldestChild: HTMLLIElement = <HTMLLIElement>this.miniConsole.output.querySelector("li");
      this.miniConsole.output.removeChild(oldestChild);
      this.miniConsole.outputCount--;
    }
    // Ensure the last line is visible when new output is displayed
    this.miniConsole.output.scrollTop = this.miniConsole.output.scrollHeight;
    return;
  }
}
