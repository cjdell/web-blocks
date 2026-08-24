import React from 'react';
import { Button, Dialog, Tabs, Toolbar } from './widgets';
import ScriptPicker from './ScriptPicker';
import ScriptStorage from '../app/ScriptStorage';

const introMessage = 'Hello there, here you can write JavaScript! For more info type: help';

let lineBack = 0;

interface CodeEditorProps {
  visible: boolean;
  scriptStorage: ScriptStorage;
}

interface State {
  mode: 'console' | 'script';
  lines: { line: string, type: string, index: number }[];
  commands: string[];
  scriptName: string;
  saveAsName: string;
  scriptPickerDialogOpen: boolean;
  saveAsDialogOpen: boolean;
}

class CodeEditor extends React.Component<CodeEditorProps, State> {
  private consoleTextarea: HTMLTextAreaElement | null = null;
  private scriptTextarea: HTMLTextAreaElement | null = null;
  private linesUl: HTMLUListElement | null = null;

  constructor(props: CodeEditorProps) {
    super(props);

    this.state = {
      mode: 'console',
      lines: [{ line: introMessage, type: 'intro', index: 0 }],
      commands: [] as string[],
      scriptName: 'Scratch Pad',
      saveAsName: '',
      scriptPickerDialogOpen: false,
      saveAsDialogOpen: false
    };

    this.keyDown = this.keyDown.bind(this);
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

  keyDown(e: React.KeyboardEvent) {
    const consoleTextarea = this.consoleTextarea;

    if (e.which === 13 && consoleTextarea) {
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

  keyUp(e: React.KeyboardEvent) {
    const consoleTextarea = this.consoleTextarea;

    if (!consoleTextarea) return;

    if (e.which === 38 || e.which === 40) {
      // The outer guard ensures which is 38 (up) or 40 (down).
      const dir = e.which === 38 ? 1 : -1;

      const newLineBack = lineBack + dir;

      if (this.state.commands.length - newLineBack >= 0 && newLineBack > 0) {
        consoleTextarea.value = this.state.commands[this.state.commands.length - newLineBack];

        lineBack = newLineBack;
      }

      e.preventDefault();
    }
  }

  addLine(text: string, type: string) {
    const lines = this.state.lines;

    text.split('\n').forEach(line => {
      lines.push({ line, type, index: this.state.lines.length });
    });

    this.setState({ lines } as State);
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

    const scriptTextarea = this.scriptTextarea;

    if (!scriptTextarea) return;

    const scriptCode = scriptTextarea.value;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptCode);

    (window as any).workerInterface.runScript(scriptCode, false);
  }

  newClicked() {
    const scriptTextarea = this.scriptTextarea;

    this.setState({ scriptName: '' } as State);

    if (!scriptTextarea) return;

    scriptTextarea.value = '';

    setTimeout(() => {
      scriptTextarea.focus();
    }, 100);
  }

  loadClicked() {
    this.setState({ scriptPickerDialogOpen: true } as State);
  }

  saveClicked() {
    if (!this.state.scriptName) {
      return this.saveAsClicked();
    }

    const scriptTextarea = this.scriptTextarea;

    if (!scriptTextarea) return;

    this.props.scriptStorage.putScript(this.state.scriptName, scriptTextarea.value);
  }

  saveAsClicked() {
    this.setState({
      saveAsName: this.state.scriptName,
      saveAsDialogOpen: true
    } as State);

    // saveAsNameInput loses focus on typing if using React event handling....
    setTimeout(() => {
      const saveAsNameInput = document.getElementById('saveAsNameInput') as HTMLInputElement;
      if (saveAsNameInput) saveAsNameInput.value = this.state.saveAsName;

      saveAsNameInput.onchange = () => {
        this.setState({ saveAsName: saveAsNameInput.value } as State);
      };

      saveAsNameInput.focus();
    }, 100);
  }

  saveAsDialogSaveClicked() {
    const scriptTextarea = this.scriptTextarea;

    this.setState({
      scriptName: this.state.saveAsName,
      saveAsDialogOpen: false
    } as State);

    if (scriptTextarea) {
      this.props.scriptStorage.putScript(this.state.saveAsName, scriptTextarea.value);
    }
  }

  tabClick(mode: 'console' | 'script') {
    this.setState({ mode } as State);
  }

  linesClick(e: React.MouseEvent) {
    const consoleTextarea = this.consoleTextarea;

    if (consoleTextarea) consoleTextarea.focus();

    e.preventDefault();
  }

  onLineClick(line: string) {
    const consoleTextarea = this.consoleTextarea;

    if (consoleTextarea) {
      consoleTextarea.value += line;
    }
  }

  componentDidMount() {
    const scriptTextarea = this.scriptTextarea;

    if (scriptTextarea) {
      scriptTextarea.value = this.props.scriptStorage.getScript(this.state.scriptName);
    }
  }

  componentDidUpdate() {
    const consoleTextarea = this.consoleTextarea;
    const scriptTextarea = this.scriptTextarea;
    const ul = this.linesUl;

    if (this.state.mode === 'console' && consoleTextarea) consoleTextarea.focus();
    if (this.state.mode === 'script' && scriptTextarea) scriptTextarea.focus();

    if (ul) {
      ul.scrollTop = ul.scrollHeight;
    }
  }

  scriptChosen(name: string) {
    const scriptTextarea = this.scriptTextarea;

    this.setState({
      scriptName: name,
      scriptPickerDialogOpen: false
    } as State);

    const script = this.props.scriptStorage.getScript(name);

    if (scriptTextarea) {
      scriptTextarea.value = script;
    }
  }

  scriptPickerDialogClosing() {
    this.setState({ scriptPickerDialogOpen: false } as State);
  }

  saveAsDialogClosing() {
    this.setState({ saveAsDialogOpen: false } as State);
  }

  render() {
    const items = this.state.lines.map((line: { type: string, line: string }, index: number) => {
      return <li key={index} className={line.type} onClick={() => this.onLineClick(line.line)}>{line.line}</li>;
    });

    const consoleTab = (
      <div className="codeView console">
        <ul ref={el => { this.linesUl = el; }} onClick={this.linesClick}>
          {items}
          <li><textarea
            ref={el => { this.consoleTextarea = el; }}
            onKeyDown={this.keyDown}
            onKeyUp={this.keyUp} /></li>
        </ul>
      </div>
    );

    const scriptTab = (
      <div className="codeView script">
        <Toolbar>
          <Button raised primary label="New" onClick={this.newClicked} />
          <Button raised primary label="Open..." onClick={this.loadClicked} />
          <Button raised label="Save" onClick={this.saveClicked} />
          <Button raised label="Save As..." onClick={this.saveAsClicked} />
          <Button raised secondary label="Run ▶" onClick={this.runClicked} />
        </Toolbar>

        <h3>{this.state.scriptName || '[New Script]'}</h3>
        <textarea ref={el => { this.scriptTextarea = el; }}></textarea>
      </div>
    );

    return (
      <div className={'codeEditor ' + (this.props.visible ? 'show' : 'hide') }>

        <Tabs
          active={this.state.mode}
          onTabClick={id => this.tabClick(id as 'console' | 'script')}
          items={[
            { id: 'console', label: 'Console', content: consoleTab },
            { id: 'script', label: 'Script', content: scriptTab },
          ]} />

        <Dialog
          open={this.state.scriptPickerDialogOpen}
          onRequestClose={this.scriptPickerDialogClosing}
          title="Choose a script..."
          actions={[
            <Button
              key="cancel"
              secondary
              label="Cancel"
              onClick={this.scriptPickerDialogClosing} />
          ]}>
          <ScriptPicker
            visible={true}
            scriptStorage={this.props.scriptStorage}
            onScriptChosen={this.scriptChosen} />
        </Dialog>

        <Dialog
          open={this.state.saveAsDialogOpen}
          onRequestClose={this.saveAsDialogClosing}
          title="Save as..."
          actions={[
            <Button
              key="cancel"
              secondary
              label="Cancel"
              onClick={this.saveAsDialogClosing} />,
            <Button
              key="save"
              label="Save"
              onClick={this.saveAsDialogSaveClicked} />
          ]}>
          <input id="saveAsNameInput" className="dialogInput" type="text" />
        </Dialog>

      </div>
    );
  }
}

export default CodeEditor;
