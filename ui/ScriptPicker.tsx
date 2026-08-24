import React from 'react';
import { List } from './widgets';

interface ScriptPickerProps {
  visible: boolean;
  onScriptChosen: Function;
  scriptStorage: any;
}

class ScriptPicker extends React.Component<ScriptPickerProps, any> {
  constructor(props: ScriptPickerProps) {
    super(props);

    this.state = { visible: false };
  }

  scriptClick(name: string) {
    this.props.onScriptChosen(name);
  }

  render() {
    const scripts: string[] = this.props.scriptStorage.getScripts().map((script: { name: string }) => script.name);

    return (
      <div className={'scriptPicker ' + (this.props.visible ? 'show' : 'hide') }>
        <List
          items={scripts.map((name, index) => ({ key: String(index), text: name }))}
          onItemClick={index => this.scriptClick(scripts[index])} />
      </div>
    );
  }
}

export default ScriptPicker;
