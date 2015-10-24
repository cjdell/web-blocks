/// <reference path="../typings/tsd.d.ts" />
import fs = require('fs');
import _ = require('underscore');

interface Script {
  name: string;
  sample: boolean;
  modified: Date;
  code: string|Buffer;
}

const samples = [{
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
    name: 'Rings',
    sample: true,
    modified: new Date(2015, 5, 2),
    code: fs.readFileSync('./samples/Rings.js')
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
  }];

export default class ScriptStorage {
  scripts = new Array<Script>();

  constructor() {
    this.load();
  }

  load() {
    let loaded = Array<Script>();

    if (window.localStorage.getItem('scripts')) {
      loaded = <Array<Script>>JSON.parse(window.localStorage.getItem('scripts'));
    }

    loaded = loaded.concat(samples);

    this.scripts = _.sortBy(loaded, 'modified');
  }

  save() {
    const scriptsToSave = _.filter(this.scripts, function(s) {
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
    const matches = this.scripts.filter(function(script) {
      return script.name === name;
    });

    if (matches.length > 0) return matches[0].code;

    if (name === 'Scratch Pad') return '// Type your code here or select a sample script by clicking the "Load" button below\n';

    return '';
  }

  putScript(name: string, code: string): void {
    const matches = this.scripts.filter(function(script) {
      return script.name === name;
    });

    if (matches.length > 0) {
      const match = matches[0];

      // Don't overwrite samples
      if (match.sample) return this.putScript(name + ' (modified)', code);

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

/*function makeRain(x, z) {
  const h = 30;
  setInterval(function() {
    if (h <= 0) return;

    api.setBlocks(x, h, z, x, h + 2, z, 0);
    api.setBlocks(x, h, z, x, h - 2, z, 3);

    h = h - 1;
  }, 100);
}

setInterval(function() {
  makeRain(100 * Math.random(), 100 * Math.random());
}, 300);*/
