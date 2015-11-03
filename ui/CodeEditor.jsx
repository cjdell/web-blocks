var React = require('react');
var mui = require('material-ui');

var Dialog = mui.Dialog;
var FlatButton = mui.FlatButton;
var RaisedButton = mui.RaisedButton;
var Toolbar = mui.Toolbar;
var ToolbarGroup = mui.ToolbarGroup;
var Tabs = mui.Tabs;
var Tab = mui.Tab;
var FontIcon = mui.FontIcon;

var ScriptPicker = require('./ScriptPicker.jsx');

var introMessage = 'Hello there, here you can write JavaScript! For more info type: help';

var lineBack = 0;

var CodeEditor = React.createClass({
  getInitialState: function() {
    return { mode: 'console', lines: [{ line: introMessage, type: 'intro' }], commands: [], scriptName: 'Scratch Pad' };
  },
  keyPress: function(e) {
    var consoleTextarea = this.refs.code;

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
    var consoleTextarea = this.refs.code;

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
    lines.push({ line: line, type: type, index: this.state.lines.length });
    this.setState({ lines: lines });
  },
  runCmd: function(cmd) {
    var that = this;

    var res = window.workerInterface.runScript(cmd, true);

    if (res instanceof Promise) {
      return res.then(function(res) {
        that.addLine(res.result, 'answer');
      });
    }

    this.addLine(res.result, 'answer');
  },
  runClicked: function() {
    var scriptTextarea = this.refs.script;
    var scriptCode = scriptTextarea.value;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptCode);

    window.workerInterface.runScript(scriptCode, false);
  },
  loadClicked: function() {
    this.refs.scriptPickerDialog.show();
  },
  saveClicked: function() {
    var scriptTextarea = this.refs.script;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptTextarea.value);
  },
  tabClick: function(mode) {
    this.setState({ mode: mode });
  },
  linesClick: function(e) {
    var consoleTextarea = this.refs.code;
    consoleTextarea.focus();
    e.preventDefault();
  },
  componentDidMount: function() {
    var scriptTextarea = this.refs.script;

    scriptTextarea.value = this.props.scriptStorage.getScript(this.state.scriptName);
  },
  componentDidUpdate: function() {
    var consoleTextarea = this.refs.code;
    var scriptTextarea = this.refs.script;
    var ul = this.refs.lines;

    if (this.state.mode === 'console') consoleTextarea.focus();
    if (this.state.mode === 'script') scriptTextarea.focus();

    ul.scrollTop = ul.scrollHeight;
  },
  scriptChosen: function(name) {
    var scriptTextarea = this.refs.script;

    this.setState({ scriptPickerVisible: false, scriptName: name });

    var script = this.props.scriptStorage.getScript(name);

    scriptTextarea.value = script;

    this.refs.scriptPickerDialog.dismiss();
  },
  render: function() {
    var items = this.state.lines.map(function(line, index) {
      return <li key={index} className={line.type}>{line.line}</li>;
    });

    var customActions = [
      <FlatButton
        key="cancel"
        label="Cancel"
        secondary={true}
        onTouchTap={(function() { this.refs.scriptPickerDialog.dismiss(); }).bind(this)} />
    ];

    return (
    <div className={'codeEditor ' + (this.props.visible ? 'show' : 'hide')}>

      <Tabs>
        <Tab label="Console">
          <div className="codeView console">
            <ul ref="lines" onClick={this.linesClick}>
              {items}
              <li><textarea ref="code" onKeyPress={this.keyPress} onKeyUp={this.keyUp}></textarea></li>
            </ul>
          </div>
        </Tab>
        <Tab label="Script">
          <Toolbar>
            <ToolbarGroup>
              <RaisedButton primary={true} onTouchTap={this.loadClicked} label="Open" />
              <RaisedButton secondary={true} onTouchTap={this.runClicked} label="Run" />
              <RaisedButton onTouchTap={this.saveClicked} label="Save" />
            </ToolbarGroup>
          </Toolbar>

          <div className="codeView script">
            <h3>{this.state.scriptName}</h3>
            <textarea ref="script"></textarea>
          </div>
        </Tab>
      </Tabs>

      <Dialog
        title="Choose a script..."
        actions={customActions}
        ref="scriptPickerDialog"
        modal={false}
        autoDetectWindowHeight={true}
        autoScrollBodyContent={true}>
        <ScriptPicker
          visible={true}
          scriptStorage={this.props.scriptStorage}
          onScriptChosen={this.scriptChosen}/>
      </Dialog>

    </div>
    );
  }
});

module.exports = CodeEditor;
