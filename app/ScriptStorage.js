var fs = require('fs');
var _ = require('underscore');

function ScriptStorage() {
  var scripts = null;

  load();

  function load() {
    var loaded = [];

    if (window.localStorage.scripts) {
      loaded = JSON.parse(window.localStorage.scripts);
    }

    loaded = loaded.concat(samples);

    scripts = _.sortBy(loaded, 'modified');
  }

  function save() {
    var scriptsToSave = _.filter(scripts, function(s) {
      return !s.sample;
    });

    window.localStorage.scripts = JSON.stringify(scriptsToSave);
  }

  function getScriptNames() {
    return _.pluck(scripts, 'name');
  }

  function getScript(name) {
    var matches = scripts.filter(function(script) {
      return script.name === name;
    });

    if (matches.length > 0) return matches[0].code;

    if (name === 'Scratch Pad') return '// Type your code here or select a sample script by clicking the "Load" button below\n';

    return '';
  }

  function putScript(name, code) {
    var matches = scripts.filter(function(script) {
      return script.name === name;
    });

    if (matches.length > 0) {
      var match = matches[0];

      // Don't overwrite samples
      if (match.sample) return putScript(name + ' (modified)', code);

      match.code = code;
      match.modified = new Date();

      save();

      return;
    }

    scripts.unshift({
      name: name,
      sample: false,
      modified: new Date(),
      code: code
    });

    save();
  }

  return {
    load: load,
    save: save,
    getScriptNames: getScriptNames,
    getScript: getScript,
    putScript: putScript
  };
}

module.exports = ScriptStorage;

var samples = [{
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
    
/*function makeRain(x, z) {
  var h = 30;
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
