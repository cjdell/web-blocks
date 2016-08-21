"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

const blockTypes: Array<BlockType> = [
  {
    "name": "Air",
    "textures": {
      "top": "textures/air.png",
      "side": "textures/air.png"
    }
  },
  {
    "name": "Stone",
    "textures": {
      "top": "textures/stone.png",
      "side": "textures/stone.png"
    }
  },
  {
    "name": "Grass",
    "textures": {
      "top": "textures/grass.png",
      "side": "textures/grass_dirt.png"
    }
  },
  {
    "name": "Dirt",
    "textures": {
      "top": "textures/dirt.png",
      "side": "textures/dirt.png"
    }
  },
  {
    "name": "Water",
    "textures": {
      "top": "textures/water.png",
      "side": "textures/water.png"
    }
  },
  {
    "name": "Webcam",
    "textures": {
      "top": "textures/webcam.png",
      "side": "textures/webcam.png"
    }
  },
  {
    "name": "Sand",
    "textures": {
      "top": "textures/sand.png",
      "side": "textures/sand.png"
    }
  },
  {
    "name": "Melon",
    "textures": {
      "top": "textures/melon_top.png",
      "side": "textures/melon_side.png"
    }
  },
  {
    "name": "Colour",
    "hideFromToolbox": true,
    "textures": {
      "top": "textures/stone.png",
      "side": "textures/stone.png"
    }
  },
  {
    "name": "Fence",
    "hideFromToolbox": true,    // WIP so disabling for now...
    "textures": {
      "top": null,
      "side": null
    }
  }
];

function getId(name: string) {
  const blockType = blockTypes.filter(blockType => blockType.name === name)[0];

  return blockTypes.indexOf(blockType);
}

export const BlockTypeIds = {
  Air: getId('Air'),
  Stone: getId('Stone'),
  Grass: getId('Grass'),
  Dirt: getId('Dirt'),
  Water: getId('Water'),
  Webcam: getId('Webcam'),
  Sand: getId('Sand'),
  Melon: getId('Melon'),
  Colour: getId('Colour'),
  Fence: getId('Fence')
};

export interface BlockType {
  name: string;
  hideFromToolbox?: boolean;
  textures: {
    top: string;
    side: string;
  }
}

export class BlockTypeList {
  getBlockTypes = () => blockTypes;
}
