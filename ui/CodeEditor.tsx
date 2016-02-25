"use strict";

import React = require('react');
import mui = require('material-ui');

const Dialog = mui.Dialog;
const FlatButton = mui.FlatButton;
const RaisedButton = mui.RaisedButton;
const Toolbar = mui.Toolbar;
const ToolbarGroup = mui.ToolbarGroup;
const Tabs = mui.Tabs;
const Tab = mui.Tab;
const FontIcon = mui.FontIcon;

const ScriptPicker = require('./ScriptPicker');

const introMessage = 'Hello there, here you can write JavaScript! For more info type: help';

let lineBack = 0;

interface CodeEditorProps {
  visible: boolean;
  scriptStorage: any;
}

const CodeEditor = React.createClass<CodeEditorProps, any>({
  getInitialState() {
    return { mode: 'console', lines: [{ line: introMessage, type: 'intro' }], commands: [], scriptName: 'Scratch Pad' };
  },
  keyPress(e: any) {
    const consoleTextarea = this.refs.code;

    if (e.which === 13) {
      let cmd = consoleTextarea.value;
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
  keyUp(e: any) {
    const consoleTextarea = this.refs.code;

    if (e.which === 38 || e.which === 40) {
      let dir: number;

      if (e.which === 38) dir = 1;
      if (e.which === 40) dir = -1;

      const newLineBack = lineBack + dir;

      if (this.state.commands.length - newLineBack >= 0 && newLineBack > 0) {
        consoleTextarea.value = this.state.commands[this.state.commands.length - newLineBack];

        lineBack = newLineBack;
      }

      e.preventDefault();
    }
  },
  addLine(line: string, type: string) {
    const lines = this.state.lines;
    lines.push({ line: line, type: type, index: this.state.lines.length });
    this.setState({ lines: lines });
  },
  runCmd(cmd: string) {
    const res = (window as any).workerInterface.runScript(cmd, true);

    if (res instanceof Promise) {
      return res.then((res: any) => {
        this.addLine(res.result, 'answer');
      });
    }

    this.addLine(res.result, 'answer');
  },
  runClicked() {
    const scriptTextarea = this.refs.script;
    const scriptCode = scriptTextarea.value;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptCode);

    (window as any).workerInterface.runScript(scriptCode, false);
  },
  loadClicked() {
    this.refs.scriptPickerDialog.show();
  },
  saveClicked() {
    const scriptTextarea = this.refs.script;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptTextarea.value);
  },
  tabClick(mode: string) {
    this.setState({ mode });
  },
  linesClick(e: any) {
    const consoleTextarea = this.refs.code;
    consoleTextarea.focus();
    e.preventDefault();
  },
  componentDidMount() {
    const scriptTextarea = this.refs.script;

    scriptTextarea.value = this.props.scriptStorage.getScript(this.state.scriptName);
  },
  componentDidUpdate() {
    const consoleTextarea = this.refs.code;
    const scriptTextarea = this.refs.script;
    const ul = this.refs.lines;

    if (this.state.mode === 'console') consoleTextarea.focus();
    if (this.state.mode === 'script') scriptTextarea.focus();

    ul.scrollTop = ul.scrollHeight;
  },
  scriptChosen(name: string) {
    const scriptTextarea = this.refs.script;

    this.setState({ scriptPickerVisible: false, scriptName: name });

    const script = this.props.scriptStorage.getScript(name);

    scriptTextarea.value = script;

    this.refs.scriptPickerDialog.dismiss();
  },
  render() {
    const items = this.state.lines.map((line: { type: string, line: string }, index: number) => {
      return <li key={index} className={line.type}>{line.line}</li>;
    });

    const customActions = [
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

export = CodeEditor;
