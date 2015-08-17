/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

export default class BlockTypeList {
  blockTypes = [{
    name: 'Air',
    textures: {
      top: null,
      side: null
    }
  }, {
      name: 'Stone',
      textures: {
        top: 'textures/stone.png',
        side: 'textures/stone.png'
      }
    }, {
      name: 'Grass',
      textures: {
        top: 'textures/grass.png',
        side: 'textures/grass_dirt.png'
      }
    }, {
      name: 'Water',
      textures: {
        top: 'textures/water.png',
        side: 'textures/water.png'
      }
    }, {
      name: 'Webcam',
      textures: {
        top: null,
        side: null
      }
    }, {
      name: 'Colour',
      hideFromToolbox: true,
      textures: {
        top: 'textures/stone.png',
        side: 'textures/stone.png'
      }
    }];

  getImage(src: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        return resolve(image);
      };

      image.onerror = () => {
        return reject();
      };

      image.src = src;
    });
  }

  getBlockTexture() {
    const canvas = document.createElement('canvas');

    const typeCount = 8;

    canvas.width = typeCount * 16;
    canvas.height = typeCount * 16;

    const ctx = <CanvasRenderingContext2D>canvas.getContext('2d');

    const blockTypePromises = this.blockTypes.map((blockType, index) => {
      if (blockType.textures.top === null) return null;

      const top = this.getImage(blockType.textures.top);
      const side = this.getImage(blockType.textures.side);

      return Promise.all([top, side]).then((results) => {
        const top = results[0], side = results[1];

        ctx.drawImage(top, 0, (typeCount - index - 1) * 16, 16, 16);
        ctx.drawImage(side, 16, (typeCount - index - 1) * 16, 16, 16);
      });
    });

    return Promise.all(blockTypePromises).then(() => {
      const texture = new THREE.Texture(canvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.LinearMipMapLinearFilter);
      texture.needsUpdate = true;
      return texture;
    });
  }

  getBlockTypes() {
    return this.blockTypes;
  }
}
