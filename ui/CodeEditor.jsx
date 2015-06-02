var React = require('react');

var ScriptPicker = require('./ScriptPicker.jsx');

//setBlocks(0,10,0,100,10,100,1)

var scriptContext = {};

Object.defineProperty(scriptContext, 'hi', {
  get: function() {
    return 'Hi there!';
  }
});

Object.defineProperty(scriptContext, 'help', {
  get: function() {
    return ['Here you can type JavaScript commands, try typing 1+1', 'To see some awesome commands, click the "Script" tab and load a sample program! :-)'].join('\n');
  }
});

var introMessage = 'Hello there, here you can write JavaScript! For more info type: help';

var lineBack = 0;

var CodeEditor = React.createClass({
  getInitialState: function() {
    return { mode: 'console', lines: [{ line: introMessage, type: 'intro' }], commands: [], scriptName: 'Scratch Pad' };
  },
  processCmd: function(e) {
    var consoleTextarea = this.refs.code.getDOMNode();

    if (e.which === 38) {
      if (this.state.commands.length - lineBack > 0) {
        lineBack++;

        var lastCmd = this.state.commands[this.state.commands.length - lineBack];
        consoleTextarea.value = lastCmd;
      }

      e.preventDefault();
    }

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
  addLine: function(line, type) {
    var lines = this.state.lines;
    lines.push({ line: line, type: type });
    this.setState({ lines: lines });
  },
  runCmd: function(cmd) {
    var that = this;

    try {
      var func = new Function('with (arguments[0]) { return ' + cmd + '; }');
      var res = func(scriptContext);
      if (res) this.addLine(res.toString(), 'answer');
    } catch (err) {
      this.addLine(err.toString(), 'error');
      console.error('parse error', err);
    }
  },
  runClicked: function() {
    var scriptTextarea = this.refs.script.getDOMNode();

    this.props.scriptStorage.putScript(this.state.scriptName, scriptTextarea.value);

    try {
      var scriptCode = scriptTextarea.value;
      var func = new Function('with (arguments[0]) { ' + scriptCode + '; }');
      func(scriptContext);
    } catch (err) {
      alert(err);
      console.error('parse error', err);
    }
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
          <li><textarea ref="code" onKeyUp={this.processCmd}></textarea></li>
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


module.exports = CodeEditor;
