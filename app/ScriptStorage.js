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

    if (name === 'Scratch Pad') return '// Type your JavaScript here or select a sample by clicking "Load"\n';

    return '';
  }

  function putScript(name, code) {
    var matches = scripts.filter(function(script) {
      return script.name === name;
    });

    var overwriteSample = false;

    if (matches.length > 0) {
      var match = matches[0];

      if (match.sample) return putScript(name + ' (modified)', code);

      match.code = code;
      match.modified = new Date();

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
  code: 'setBlocks(95,5,95,105,15,105,1);'
}, {
  name: 'Pyramid',
  sample: true,
  modified: new Date(2015, 5, 1),
  code: [
    'for (var i = 0; i < 10; i++) {',
    '  setBlocks(90 + i, 5 + i, 90 + i, 110 - i, 5 + i, 110 - i, 2);',
    '}'
  ].join('\n')
}, {
  name: 'Circle',
  sample: true,
  modified: new Date(2015, 5, 1),
  code: [
    'for (var x = -20; x < 20; x++) {',
    '  for (var z = -20; z < 20; z++) {',
    '    if (Math.sqrt(x * x + z * z) < 19) {',
    '      setBlocks(x + 100, 0, z + 100, x + 100, 10, z + 100, 1);',
    '    }',
    '  }',
    '}'
  ].join('\n')
}];
