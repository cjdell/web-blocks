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
    return ['Here\'s a command you try: setBlocks(x1,y1,z1,x2,y2,z2,type)', 'See the "Script" tab for sample commands'].join('\n');
  }
});

var introMessage = 'Hello there, here you can write JavaScript! For more info type: help';

var CodeEditor = React.createClass({
  getInitialState: function() {
    return { mode: 'console', lines: [{ line: introMessage, type: 'intro' }], scriptName: 'Scratch Pad' };
  },
  processCmd: function(e) {
    if (e.which === 13) {
      var cmd = this.refs.code.getDOMNode().value;
      this.refs.code.getDOMNode().value = '';
      this.addLine(cmd, 'command');
      this.runCmd(cmd);
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
