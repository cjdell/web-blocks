import _ from 'underscore';

import Cube from '../samples/Cube.js' with { type: "text" };
import Pyramid from '../samples/Pyramid.js' with { type: "text" };
import Circle from '../samples/Circle.js' with { type: "text" };
import MagicBridge from '../samples/MagicBridge.js' with { type: "text" };
import Rings from '../samples/Rings.js' with { type: "text" };
import Trail from '../samples/Trail.js' with { type: "text" };
import Dizzy from '../samples/Dizzy.js' with { type: "text" };
import House from '../samples/House.js' with { type: "text" };
import Palette from '../samples/Palette.js' with { type: "text" };
import Pong from '../samples/Pong.js' with { type: "text" };
import MouseBlock from '../samples/MouseBlock.js' with { type: "text" };
import TunnelDigger from '../samples/TunnelDigger.js' with { type: "text" };
import UFO from '../samples/UFO.js' with { type: "text" };
import BoundPillar from '../samples/BoundPillar.js' with { type: "text" };
import BoundHouse from '../samples/BoundHouse.js' with { type: "text" };
import Stargate from '../samples/Stargate.js' with { type: "text" };

interface Script {
  name: string;
  sample: boolean;
  modified: Date;
  code: string;
}

console.log('Cube', Cube)

const samples = [
  {
    name: 'Cube',
    sample: true,
    modified: new Date(2015, 5, 1),
    code: Cube.toString(),
  }, {
    name: 'Pyramid',
    sample: true,
    modified: new Date(2015, 5, 1),
    code: Pyramid.toString(),
  }, {
    name: 'Circle',
    sample: true,
    modified: new Date(2015, 5, 1),
    code: Circle.toString(),
  }, {
    name: 'Magic Bridge',
    sample: true,
    modified: new Date(2016, 9, 11),
    code: MagicBridge.toString(),
  }, {
    name: 'Rings',
    sample: true,
    modified: new Date(2015, 5, 2),
    code: Rings.toString(),
  }, {
    name: 'Trail',
    sample: true,
    modified: new Date(2015, 5, 4),
    code: Trail.toString(),
  }, {
    name: 'Dizzy',
    sample: true,
    modified: new Date(2015, 5, 7),
    code: Dizzy.toString(),
  }, {
    name: 'House',
    sample: true,
    modified: new Date(2015, 5, 7),
    code: House.toString(),
  }, {
    name: 'Palette',
    sample: true,
    modified: new Date(2015, 5, 7),
    code: Palette.toString(),
  }, {
    name: 'Pong',
    sample: true,
    modified: new Date(2016, 8, 21),
    code: Pong.toString(),
  }, {
    name: 'Mouse Block',
    sample: true,
    modified: new Date(2016, 5, 30),
    code: MouseBlock.toString(),
  }, {
    name: 'Tunnel Digger',
    sample: true,
    modified: new Date(2016, 9, 17),
    code: TunnelDigger.toString(),
  }, {
    name: 'UFO',
    sample: true,
    modified: new Date(2016, 8, 28),
    code: UFO.toString(),
  }, {
    name: 'Button Activated Pillar',
    sample: true,
    modified: new Date(2017, 1, 1),
    code: BoundPillar.toString(),
  }, {
    name: 'Button Activated House',
    sample: true,
    modified: new Date(2017, 1, 2),
    code: BoundHouse.toString(),
  }, {
    name: 'Button Activated Stargate',
    sample: true,
    modified: new Date(2017, 1, 3),
    code: Stargate.toString(),
  }
];

export default class ScriptStorage {
  scripts = new Array<Script>();

  constructor() {
    this.load();
  }

  load() {
    let loaded = new Array<Script>();

    const scripts = window.localStorage.getItem('scripts');

    if (scripts) {
      loaded = <Script[]>JSON.parse(scripts);
    }

    loaded = loaded.concat(samples);

    this.scripts = _.sortBy(loaded, 'modified');
  }

  save() {
    const scriptsToSave = _.filter(this.scripts, s => {
      return !s.sample;
    });

    window.localStorage.setItem('scripts', JSON.stringify(scriptsToSave));
  }

  getScriptNames() {
    return _.pluck(this.scripts, 'name');
  }

  getScripts() {
    return this.scripts;
  }

  getScript(name: string) {
    const matches = this.scripts.filter(script => {
      return script.name === name;
    });

    if (matches.length > 0) {
      return matches[0].code;
    }

    if (name === 'Scratch Pad') {
      return '// Type your code here or select a sample script by clicking the "Open" button above\n';
    }

    return '';
  }

  putScript(name: string, code: string): void {
    const matches = this.scripts.filter(script => {
      return script.name === name;
    });

    if (matches.length > 0) {
      const match = matches[0];

      // Don't overwrite samples
      if (match.sample) {
        return this.putScript(name + ' (modified)', code);
      }

      match.code = code;
      match.modified = new Date();

      this.save();

      return;
    }

    this.scripts.unshift({
      name: name,
      sample: false,
      modified: new Date(),
      code: code
    });

    this.save();
  }
}
