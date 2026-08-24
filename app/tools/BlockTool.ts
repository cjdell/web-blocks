import * as THREE from 'three';

import type { IntVector3 } from '../../common/WorldInfo';
import { Context } from './ToolBase';

export default class BlockTool {
  context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  onMouseClick(mouse: THREE.Vector2, pos: IntVector3, side: number): void {
    if (pos) {
      this.context.workerInterface.addBlock(pos, side, this.context.type).catch(() => {
        /* fire-and-forget: worker crash or other transient error */
      });
    }

    this.context.finished();
  }

  onMouseMove(_mouse: THREE.Vector2, _pos: IntVector3 | null, _side: number | null): void {
    // No-op
  }

  cancel(): void {
    // No-op
  }
}
