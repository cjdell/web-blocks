import React = require('react');
import mui = require('material-ui');

const { List, ListItem } = mui;

interface ScriptPickerProps {
  visible: boolean;
  onScriptChosen: Function;
  scriptStorage: any;
}

class ScriptPicker extends React.Component<ScriptPickerProps, any> {
  constructor() {
    super();

    this.state = { visible: false };
  }

  scriptClick(name: string) {
    this.props.onScriptChosen(name);
  }

  render() {
    const lis = this.props.scriptStorage.getScripts().map((script: { name: string }, index: number) => {
      return <ListItem key={index} primaryText={script.name} onTouchTap={this.scriptClick.bind(this, script.name) } />
    });

    return (
      <div className={'scriptPicker ' + (this.props.visible ? 'show' : 'hide') }>
        <List>
          {lis}
        </List>
      </div>
    );
  }
}

export = ScriptPicker;
