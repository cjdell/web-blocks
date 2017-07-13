import React = require('react');
import mui = require('material-ui');
import ScriptPicker = require('./ScriptPicker');

const { Dialog, FlatButton, RaisedButton, Toolbar, ToolbarGroup, Tabs, Tab, TextField } = mui;

const introMessage = 'Hello there, here you can write JavaScript! For more info type: help';

let lineBack = 0;

interface CodeEditorProps {
  visible: boolean;
  scriptStorage: any;
}

class CodeEditor extends React.Component<CodeEditorProps, any> {
  constructor() {
    super();

    this.state = {
      mode: 'console',
      lines: [{ line: introMessage, type: 'intro' }],
      commands: [] as string[],
      scriptName: 'Scratch Pad',
      saveAsName: '',
      scriptPickerDialogOpen: false,
      saveAsDialogOpen: false
    };

    this.keyPress = this.keyPress.bind(this);
    this.keyUp = this.keyUp.bind(this);
    this.linesClick = this.linesClick.bind(this);
    this.loadClicked = this.loadClicked.bind(this);
    this.newClicked = this.newClicked.bind(this);
    this.runClicked = this.runClicked.bind(this);
    this.saveAsClicked = this.saveAsClicked.bind(this);
    this.saveAsDialogSaveClicked = this.saveAsDialogSaveClicked.bind(this);
    this.scriptChosen = this.scriptChosen.bind(this);
    this.scriptPickerDialogClosing = this.scriptPickerDialogClosing.bind(this);
  }

  keyPress(e: any) {
    const consoleTextarea = this.refs['code'] as HTMLTextAreaElement;

    if (e.which === 13) {
      let cmd = consoleTextarea.value;
      consoleTextarea.value = '';

      // Take the CR off the end
      if (cmd.length && [10, 13].indexOf(cmd.charCodeAt(cmd.length - 1)) !== -1) {
        cmd = cmd.substring(0, cmd.length - 1);
      }

      if (cmd.length && [10, 13].indexOf(cmd.charCodeAt(cmd.length - 1)) !== -1) {
        cmd = cmd.substring(0, cmd.length - 1);
      }

      this.state.commands.push(cmd);

      lineBack = 0;

      this.addLine(cmd, 'command');
      this.runCmd(cmd);

      e.preventDefault();
    }
  }

  keyUp(e: any) {
    const consoleTextarea = this.refs['code'] as HTMLTextAreaElement;

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
  }

  addLine(line: string, type: string) {
    const lines = this.state.lines;
    lines.push({ line, type, index: this.state.lines.length });
    this.setState({ lines });
  }

  runCmd(cmd: string) {
    const res = (window as any).workerInterface.runScript(cmd, true);

    if (res instanceof Promise) {
      return res.then((res: any) => {
        this.addLine(res.result, 'answer');
      });
    }

    this.addLine(res.result, 'answer');
  }

  runClicked() {
    if (!this.state.scriptName) {
      alert('Please save your script first');
      return;
    }

    const scriptTextarea = this.refs['script'] as HTMLTextAreaElement;
    const scriptCode = scriptTextarea.value;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptCode);

    (window as any).workerInterface.runScript(scriptCode, false);
  }

  newClicked() {
    const scriptTextarea = this.refs['script'] as HTMLTextAreaElement;

    this.setState({ scriptName: '' });

    scriptTextarea.value = '';

    setTimeout(() => {
      scriptTextarea.focus();
    }, 100);
  }

  loadClicked() {
    this.setState({ scriptPickerDialogOpen: true });
  }

  saveClicked() {
    if (!this.state.scriptName) {
      return this.saveAsClicked();
    }

    const scriptTextarea = this.refs['script'] as HTMLTextAreaElement;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptTextarea.value);
  }

  saveAsClicked() {
    this.setState({
      saveAsName: this.state.scriptName,
      saveAsDialogOpen: true
    });

    // saveAsNameInput loses focus on typing if using React event handling....
    setTimeout(() => {
      const saveAsNameInput = document.getElementById('saveAsNameInput') as HTMLInputElement;
      if (saveAsNameInput) saveAsNameInput.value = this.state.saveAsName;

      saveAsNameInput.onchange = () => {
        this.setState({ saveAsName: saveAsNameInput.value });
      };

      saveAsNameInput.focus();
    }, 100);
  }

  saveAsDialogSaveClicked() {
    const scriptTextarea = this.refs['script'] as HTMLTextAreaElement;

    this.setState({
      scriptName: this.state.saveAsName,
      saveAsDialogOpen: false
    });

    this.props.scriptStorage.putScript(this.state.saveAsName, scriptTextarea.value);
  }

  tabClick(mode: string) {
    this.setState({ mode });
  }

  linesClick(e: any) {
    const consoleTextarea = this.refs['code'] as HTMLTextAreaElement;
    consoleTextarea.focus();
    e.preventDefault();
  }

  componentDidMount() {
    const scriptTextarea = this.refs['script'] as HTMLTextAreaElement;

    scriptTextarea.value = this.props.scriptStorage.getScript(this.state.scriptName);
  }

  componentDidUpdate() {
    const consoleTextarea = this.refs['code'] as HTMLTextAreaElement;
    const scriptTextarea = this.refs['script'] as HTMLTextAreaElement;
    const ul = this.refs['lines'] as HTMLUListElement;

    if (this.state.mode === 'console') consoleTextarea.focus();
    if (this.state.mode === 'script') scriptTextarea.focus();

    ul.scrollTop = ul.scrollHeight;
  }

  scriptChosen(name: string) {
    const scriptTextarea = this.refs['script'] as HTMLTextAreaElement;

    this.setState({
      scriptName: name,
      scriptPickerDialogOpen: false
    });

    const script = this.props.scriptStorage.getScript(name);

    scriptTextarea.value = script;
  }

  scriptPickerDialogClosing() {
    this.setState({ scriptPickerDialogOpen: false });
  }

  saveAsDialogClosing() {
    this.setState({ saveAsDialogOpen: false });
  }

  render() {
    const items = this.state.lines.map((line: { type: string, line: string }, index: number) => {
      return <li key={index} className={line.type}>{line.line}</li>;
    });

    const scriptPickerCustomActions = [
      <FlatButton
        key="cancel"
        label="Cancel"
        secondary={true}
        onTouchTap={this.scriptPickerDialogClosing} />
    ];

    const saveAsCustomActions = [
      <FlatButton
        key="cancel"
        label="Cancel"
        secondary={true}
        onTouchTap={this.saveAsDialogClosing} />,
      <FlatButton
        key="save"
        label="Save"
        onTouchTap={this.saveAsDialogSaveClicked} />
    ];

    return (
      <div className={'codeEditor ' + (this.props.visible ? 'show' : 'hide') }>

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
                <RaisedButton primary={true} onTouchTap={this.newClicked} label="New" />
                <RaisedButton primary={true} onTouchTap={this.loadClicked} label="Open..." />
                <RaisedButton onTouchTap={this.saveClicked} label="Save" />
                <RaisedButton onTouchTap={this.saveAsClicked} label="Save As..." />
                <RaisedButton secondary={true} onTouchTap={this.runClicked} label="Run ▶" />
              </ToolbarGroup>
            </Toolbar>

            <div className="codeView script">
              <h3>{this.state.scriptName || '[New Script]'}</h3>
              <textarea ref="script"></textarea>
            </div>
          </Tab>
        </Tabs>

        <Dialog
          open={this.state.scriptPickerDialogOpen}
          onRequestClose={this.scriptPickerDialogClosing}
          title="Choose a script..."
          actions={scriptPickerCustomActions}
          ref="scriptPickerDialog"
          modal={false}
          autoDetectWindowHeight={true}
          autoScrollBodyContent={true}>
          <ScriptPicker
            visible={true}
            scriptStorage={this.props.scriptStorage}
            onScriptChosen={this.scriptChosen}/>
        </Dialog>

        <Dialog
          open={this.state.saveAsDialogOpen}
          onRequestClose={this.state.saveAsDialogClosing}
          key="saveAsDialog"
          title="Save as..."
          actions={saveAsCustomActions}
          ref="saveAsDialog"
          modal={false}
          autoDetectWindowHeight={true}
          autoScrollBodyContent={true}>
          <TextField
            key="saveAsNameInput"
            id="saveAsNameInput" />
        </Dialog>

      </div>
    );
  }
}

export = CodeEditor;
