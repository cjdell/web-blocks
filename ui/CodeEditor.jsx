var React = require('react');

var ScriptPicker = require('./ScriptPicker.jsx');

var introMessage = 'Hello there, here you can write JavaScript! For more info type: help';

var lineBack = 0;

var codeRunner = new CodeRunner();

var CodeEditor = React.createClass({
  getInitialState: function() {
    return { mode: 'console', lines: [{ line: introMessage, type: 'intro' }], commands: [], scriptName: 'Scratch Pad' };
  },
  keyPress: function(e) {
    var consoleTextarea = this.refs.code.getDOMNode();

    if (e.which === 13) {
      var cmd = consoleTextarea.value;
      consoleTextarea.value = '';

      // Take the CR off the end
      if (cmd.length && [10, 13].indexOf(cmd.charCodeAt(cmd.length - 1)) !== -1) cmd = cmd.substring(0, cmd.length - 1);
      if (cmd.length && [10, 13].indexOf(cmd.charCodeAt(cmd.length - 1)) !== -1) cmd = cmd.substring(0, cmd.length - 1);

      this.state.commands.push(cmd);

      lineBack = 0;

      this.addLine(cmd, 'command');
      this.runCmd(cmd);

      e.preventDefault();
    }
  },
  keyUp: function(e) {
    var consoleTextarea = this.refs.code.getDOMNode();

    if (e.which === 38 || e.which === 40) {
      if (e.which === 38) dir = 1;
      if (e.which === 40) dir = -1;

      var newLineBack = lineBack + dir;

      if (this.state.commands.length - newLineBack >= 0 && newLineBack > 0) {
        consoleTextarea.value = this.state.commands[this.state.commands.length - newLineBack];

        lineBack = newLineBack;
      }

      e.preventDefault();
    }
  },
  addLine: function(line, type) {
    var lines = this.state.lines;
    lines.push({ line: line, type: type });
    this.setState({ lines: lines });
  },
  runCmd: function(cmd) {
    var that = this;

    var res = codeRunner.run(cmd, true);

    if (res instanceof Promise) {
      return res.then(function(res) {
        that.addLine(res, 'answer');
      });
    }

    this.addLine(res, 'answer');
  },
  runClicked: function() {
    var scriptTextarea = this.refs.script.getDOMNode();
    var scriptCode = scriptTextarea.value;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptCode);

    codeRunner.run(scriptCode, false);
  },
  loadClicked: function() {
    this.setState({ scriptPickerVisible: true });
  },
  saveClicked: function() {
    var scriptTextarea = this.refs.script.getDOMNode();

    this.props.scriptStorage.putScript(this.state.scriptName, scriptTextarea.value);
  },
  tabClick: function(mode) {
    this.setState({ mode: mode });
  },
  linesClick: function(e) {
    var consoleTextarea = this.refs.code.getDOMNode();
    consoleTextarea.focus();
    e.preventDefault();
  },
  componentDidMount: function() {
    var scriptTextarea = this.refs.script.getDOMNode();

    scriptTextarea.value = this.props.scriptStorage.getScript(this.state.scriptName);
  },
  componentDidUpdate: function() {
    var consoleTextarea = this.refs.code.getDOMNode();
    var scriptTextarea = this.refs.script.getDOMNode();
    var ul = this.refs.lines.getDOMNode();

    if (this.state.mode === 'console') consoleTextarea.focus();
    if (this.state.mode === 'script') scriptTextarea.focus();

    ul.scrollTop = ul.scrollHeight;
  },
  scriptChosen: function(name) {
    var scriptTextarea = this.refs.script.getDOMNode();

    this.setState({ scriptPickerVisible: false, scriptName: name });

    scriptTextarea.value = this.props.scriptStorage.getScript(name);
  },
  render: function() {
    var items = this.state.lines.map(function(line, index) {
      return <li key={index} className={line.type}>{line.line}</li>;
    });

    return (
    <div className={'codeEditor ' + (this.props.visible ? 'show' : 'hide')}>
      <div className="tabs">
        <div className="tab">
          <a onClick={this.tabClick.bind(this, 'console')}>Console</a>
        </div>
        <div className="tab">
          <a onClick={this.tabClick.bind(this, 'script')}>Script</a>
        </div>
      </div>
      <div className={'codeView console ' + (this.state.mode === 'console' ? 'show' : 'hide')}>
        <ul ref="lines" onClick={this.linesClick}>
          {items}
          <li><textarea ref="code" onKeyPress={this.keyPress} onKeyUp={this.keyUp}></textarea></li>
        </ul>
      </div>
      <div className={'codeView script ' + (this.state.mode === 'script' ? 'show' : 'hide')}>
        <h3>{this.state.scriptName}</h3>

        <textarea ref="script"></textarea>

        <div className="buttons">
          <button onClick={this.loadClicked}>Load</button>
          <button onClick={this.runClicked}>Run</button>
          <button onClick={this.saveClicked}>Save</button>
        </div>
      </div>
      <ScriptPicker
      visible={this.state.scriptPickerVisible}
      scriptStorage={this.props.scriptStorage}
      onScriptChosen={this.scriptChosen}/>
    </div>
    );
  }
});

function CodeRunner() {
  function run(code, expr) {
    var toRun = '';

    Object.keys(window.api).forEach(function(key) {
      toRun += 'var ' + key + ' = window.api.' + key + ';\n';
    });

    if (expr) {
      toRun += 'return (' + code + ');';
    } else {
      toRun += code;
    }

    window.api.clearIntervals();

    try {
      var func = new Function('context', toRun);

      var res = func(window.api);

      if (typeof res !== 'undefined') {
        if (res instanceof Promise) return res;

        if (typeof res === 'object') return JSON.stringify(res);

        return res.toString();
      }
    } catch (err) {
      alert(err);
      console.error('parse error', err);
    }
  }

  return {
    run: run
  };
}

module.exports = CodeEditor;
