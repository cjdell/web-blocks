/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

import wi from './WorkerInterface';

module TextRenderer {
  export interface TextRenderer {
    renderText(offset: THREE.Vector3, message: string): void;
  }

  export function NewTextRenderer(workerInterface: wi.WorkerInterface): TextRenderer {
    function renderText(offset: THREE.Vector3, message: string) {
      let canvas = document.createElement('canvas');

      canvas.width = 256;
      canvas.height = 16;

      let ctx = <CanvasRenderingContext2D>canvas.getContext("2d");

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "white";
      ctx.font = "16px arial";
      ctx.fillText(message, 0, 12);

      let data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      for (let i = 0; i < data.length; i += 4) {
        let pix = i / 4;
        let x = pix % canvas.width;
        let y = (pix / canvas.width) | 0;

        let col = data[i + 1];
        let on = col > 240 ? 1 : 0;

        let pos = new THREE.Vector3(offset.x + x, offset.y + canvas.height - y, offset.z);

        workerInterface.setBlocks(pos, pos, on, 0, true);
      }

      //window.location.href = canvas.toDataURL();
    }

    return {
      renderText: renderText
    };
  }
}

export default TextRenderer;
