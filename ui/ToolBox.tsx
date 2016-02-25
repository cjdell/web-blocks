import React = require('react');
import ScriptStorage from '../app/ScriptStorage';
import CodeEditor = require('./CodeEditor');
import Game from '../app/Game';

const scriptStorage = new ScriptStorage();

const ToolBox = React.createClass<{ game: Game }, any>({
  getInitialState() {
    return {
      blockTypeIndex: 1,
      codeEditorVisible: false
    };
  },
  blockTypeClick(blockTypeIndex: number) {
    this.setState({ blockTypeIndex: blockTypeIndex });

    this.props.game.setBlockType(blockTypeIndex);
  },
  toggleCodeEditor() {
    this.setState({ codeEditorVisible: !this.state.codeEditorVisible });
  },
  componentDidMount() {
    document.addEventListener('keyup', function(event: any) {
      // Toggle code editor on escape key
      if (event.keyCode === 27) this.toggleCodeEditor();
    }.bind(this), false);
  },
  componentDidUpdate() {
    (window as any).blockMovement = this.state.codeEditorVisible;
  },
  render() {
    let lis = [] as any[];

    if (this.props.game) {
      const blockTypes = this.props.game.getBlockTypes();

      lis = blockTypes.map((blockType: any, index: number) => {
        if (blockType.hideFromToolbox) return null;

        return (
        <li key={index}
            title={blockType.name}
            onClick={this.blockTypeClick.bind(this, index)}
            className={index === this.state.blockTypeIndex ? 'selected' : ''}
            style={ blockType.textures.side ? { 'backgroundImage': "url('" + blockType.textures.side + "')" } : {} }>
        </li>
        );
      });
    }

    return (
    <div className="toolBox">
      <CodeEditor visible={this.state.codeEditorVisible} scriptStorage={scriptStorage}/>
      <ul className="large">
        <li className="codeButton" onClick={this.toggleCodeEditor}>&lt;Code&gt;</li>
      </ul>
      <ul className="small">{lis}</ul>
      <div className="author">
        <div>Created by: <a href="https://twitter.com/cjdell" target="_blank">@cjdell</a></div>
        <div><a href="https://github.com/cjdell/web-blocks" target="_blank">GitHub</a></div>
      </div>
    </div>
    );
  }
});

export = ToolBox;
