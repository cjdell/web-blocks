"use strict";
/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';
import { Context, Tool } from './ToolBase';

export default class BlockTool {
  context: Context;

  constructor(context: Context) {
    this.context = context;

    // this.onBlockClick = this.onBlockClick.bind(this);
    // this.onMouseClick = this.onMouseClick.bind(this);
    // this.onMouseMove = this.onMouseMove.bind(this);
  }

  onMouseClick(mouse: THREE.Vector2, pos: com.IntVector3, side: number): void {
    this.context.workerInterface.addBlock(pos, side, this.context.type);

    this.context.finished();
  }

  onMouseMove(mouse: THREE.Vector2, pos: com.IntVector3, side: number): void {

  }

  cancel(): void {

  }
}
