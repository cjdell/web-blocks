import fs = require('fs');
import _ = require('underscore');

interface Script {
  name: string;
  sample: boolean;
  modified: Date;
  code: string | Buffer;
}

const samples = [
  {
    name: 'Cube',
    sample: true,
    modified: new Date(2015, 5, 1),
    code: fs.readFileSync('./samples/Cube.js')
  }, {
    name: 'Pyramid',
    sample: true,
    modified: new Date(2015, 5, 1),
    code: fs.readFileSync('./samples/Pyramid.js')
  }, {
    name: 'Circle',
    sample: true,
    modified: new Date(2015, 5, 1),
    code: fs.readFileSync('./samples/Circle.js')
  }, {
    name: 'Magic Bridge',
    sample: true,
    modified: new Date(2016, 9, 11),
    code: fs.readFileSync('./samples/MagicBridge.js')
  }, {
    name: 'Rings',
    sample: true,
    modified: new Date(2015, 5, 2),
    code: fs.readFileSync('./samples/Rings.js')
  }, {
    name: 'Stargate',
    sample: true,
    modified: new Date(2015, 9, 17),
    code: fs.readFileSync('./samples/Stargate.js')
  }, {
    name: 'Trail',
    sample: true,
    modified: new Date(2015, 5, 4),
    code: fs.readFileSync('./samples/Trail.js')
  }, {
    name: 'Dizzy',
    sample: true,
    modified: new Date(2015, 5, 7),
    code: fs.readFileSync('./samples/Dizzy.js')
  }, {
    name: 'House',
    sample: true,
    modified: new Date(2015, 5, 7),
    code: fs.readFileSync('./samples/House.js')
  }, {
    name: 'Palette',
    sample: true,
    modified: new Date(2015, 5, 7),
    code: fs.readFileSync('./samples/Palette.js')
  }, {
    name: 'Bound Pillar',
    sample: true,
    modified: new Date(2016, 5, 30),
    code: fs.readFileSync('./samples/BoundPillar.js')
  }, {
    name: 'Pong',
    sample: true,
    modified: new Date(2016, 8, 21),
    code: fs.readFileSync('./samples/Pong.js')
  }, {
    name: 'Mouse Block',
    sample: true,
    modified: new Date(2016, 5, 30),
    code: fs.readFileSync('./samples/MouseBlock.js')
  }, {
    name: 'Bound House',
    sample: true,
    modified: new Date(2016, 8, 28),
    code: fs.readFileSync('./samples/BoundHouse.js')
  }, {
    name: 'Tunnel Digger',
    sample: true,
    modified: new Date(2016, 9, 17),
    code: fs.readFileSync('./samples/TunnelDigger.js')
  }, {
    name: 'UFO',
    sample: true,
    modified: new Date(2016, 8, 28),
    code: fs.readFileSync('./samples/UFO.js')
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
