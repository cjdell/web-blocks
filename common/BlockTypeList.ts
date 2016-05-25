"use strict";
/// <reference path="../typings/tsd.d.ts" />
import THREE = require('three');

const blockTypes = [
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

export interface BlockType {
  name: string;
  hideFromToolbox?: boolean;
  textures: {
    top: string;
    side: string;
  }
}

export class BlockTypeList {
  getBlockTypes(): Array<BlockType> {
    return blockTypes;
  }
}
