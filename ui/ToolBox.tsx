import React = require('react');
import ScriptStorage from '../app/ScriptStorage';
import CodeEditor = require('./CodeEditor');
import Game from '../app/Game';

const scriptStorage = new ScriptStorage();

const MoveTypes = [
  {
    type: 'walk',
    name: 'Walk',
    icon: 'textures/move-walk.png',
    gravity: 0.002
  },
  {
    type: 'fly',
    name: 'Fly',
    icon: 'textures/move-fly.png',
    gravity: 0.0
  }
];

const ToolBox = React.createClass<{ game: Game }, any>({
  getInitialState() {
    return {
      blockTypeIndex: 1,
      codeEditorVisible: false,
      toolType: 'block',
      moveType: 'walk'
    };
  },

  blockTypeClick(blockTypeIndex: number) {
    this.setState({ blockTypeIndex: blockTypeIndex });

    (this.props.game as Game).setBlockType(blockTypeIndex);
  },
  toggleCodeEditor() {
    this.setState({ codeEditorVisible: !this.state.codeEditorVisible });
  },
  switchTool(toolType: string) {
    this.setState({ toolType });

    (this.props.game as Game).setTool(toolType);
  },
  switchMove(moveType: string) {
    this.setState({ moveType });

    const mt = MoveTypes.filter(mt => mt.type === moveType)[0];

    (this.props.game as Game).setGravity(mt.gravity);
  },

  componentDidMount() {
    document.addEventListener('keyup', (event) => {
      // Toggle code editor on escape key
      if (event.keyCode === 27) this.toggleCodeEditor();
    }, false);
  },
  componentDidUpdate() {
    (window as any).blockMovement = this.state.codeEditorVisible;
  },

  render() {
    const game = this.props.game as Game;

    let blockTypeLis = [] as JSX.Element[];
    let toolTypeLis = [] as JSX.Element[];
    let moveTypeLis = [] as JSX.Element[];

    if (game) {
      const blockTypes = game.getBlockTypes();

      blockTypeLis = blockTypes.map((blockType, index) => {
        if (blockType.hideFromToolbox) return null;

        return (
          <li key={index}
            title={blockType.name}
            onClick={this.blockTypeClick.bind(this, index) }
            className={index === this.state.blockTypeIndex ? 'selected' : ''}
            style={ blockType.textures.side ? { 'backgroundImage': "url('" + blockType.textures.side + "')" } : {} }>
          </li>
        );
      });

      const toolTypes = game.getAvailableTools();

      toolTypeLis = toolTypes.map((toolType, index) => {
        return (
          <li key={index}
            title={toolType.name}
            onClick={this.switchTool.bind(this, toolType.type) }
            className={toolType.type === this.state.toolType ? 'selected' : ''}
            style={ { 'backgroundImage': "url('" + toolType.icon + "')" } }>
          </li>
        );
      });

      moveTypeLis = MoveTypes.map((moveType, index) => {
        return (
          <li key={index}
            title={moveType.name}
            onClick={this.switchMove.bind(this, moveType.type) }
            className={moveType.type === this.state.moveType ? 'selected' : ''}
            style={ { 'backgroundImage': "url('" + moveType.icon + "')" } }>
          </li>
        );
      });
    }

    return (
      <div className="toolBox">
        <CodeEditor visible={this.state.codeEditorVisible} scriptStorage={scriptStorage}/>

        <ul className="large">
          <li
            className="codeButton"
            onClick={this.toggleCodeEditor}
            style={{ backgroundImage: 'url(./textures/command_block.png)' }}>
            &lt; Code&gt;
          </li>
        </ul>

        <ul className="small">{toolTypeLis}</ul>

        <ul className="small">{blockTypeLis}</ul>

        <ul className="small">{moveTypeLis}</ul>

        <div className="author">
          <div>Created by: <a href="https://twitter.com/cjdell" target="_blank"> @cjdell</a></div>
          <div><a href="https://github.com/cjdell/web-blocks" target="_blank">GitHub</a></div>
        </div>
      </div>
    );
  }
});

export = ToolBox;
