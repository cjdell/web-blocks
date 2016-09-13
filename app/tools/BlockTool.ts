"use strict";
/// <reference path="../../typings/tsd.d.ts" />
import THREE = require('three');

import com from '../../common/WorldInfo';
import { Context } from './ToolBase';

export default class BlockTool {
  context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  onMouseClick(mouse: THREE.Vector2, pos: com.IntVector3, side: number): void {
    if (pos) {
      this.context.workerInterface.addBlock(pos, side, this.context.type);
    }

    this.context.finished();
  }

  onMouseMove(mouse: THREE.Vector2, pos: com.IntVector3, side: number): void {
    return null;
  }

  cancel(): void {
    return null;
  }
}
