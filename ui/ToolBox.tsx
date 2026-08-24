import React from 'react';
import CodeEditor from './CodeEditor';
import ScriptStorage  from '../app/ScriptStorage';
import Game           from '../app/Game';

const scriptStorage = new ScriptStorage();

const MoveTypes = [
  {
    type: 'walk',
    name: 'Walk',
    icon: 'textures/move-walk.png',
    gravity: 9.8
  },
  {
    type: 'fly',
    name: 'Fly',
    icon: 'textures/move-fly.png',
    gravity: 1.0
  }
];

interface ToolBoxState {
  blockTypeIndex: number;
  codeEditorVisible: boolean;
  toolType: string;
  moveType: string;
}

class ToolBox extends React.Component<{ game?: Game }, ToolBoxState> {
  constructor(props: { game?: Game }) {
    super(props);

    this.state = {
      blockTypeIndex: 1,
      codeEditorVisible: false,
      toolType: 'block',
      moveType: 'walk'
    };

    this.blockTypeClick = this.blockTypeClick.bind(this);
    this.toggleCodeEditor = this.toggleCodeEditor.bind(this);
    this.switchTool = this.switchTool.bind(this);
    this.switchMove = this.switchMove.bind(this);
  }

  blockTypeClick(blockTypeIndex: number) {
    this.setState({ blockTypeIndex: blockTypeIndex });

    if (this.props.game) this.props.game.setBlockType(blockTypeIndex);
  }

  toggleCodeEditor() {
    this.setState({ codeEditorVisible: !this.state.codeEditorVisible });
  }

  switchTool(toolType: string) {
    this.setState({ toolType });

    if (this.props.game) this.props.game.setTool(toolType);
  }

  switchMove(moveType: string) {
    this.setState({ moveType });

    const mt = MoveTypes.filter(m => m.type === moveType)[0];

    if (this.props.game) this.props.game.setGravity(mt.gravity);
  }

  componentDidMount() {
    const onKeyUp = (event: KeyboardEvent) => {
      // Toggle code editor on escape key
      if (event.key === 'Escape' || event.keyCode === 27) this.toggleCodeEditor();
    };

    document.addEventListener('keyup', onKeyUp, false);

    // Store for potential cleanup; ToolBox lives for the whole app lifetime.
    this.cleanup = () => document.removeEventListener('keyup', onKeyUp, false);
  }

  cleanup?: () => void;

  componentWillUnmount() {
    if (this.cleanup) this.cleanup();
  }

  componentDidUpdate() {
    (window as any).blockMovement = this.state.codeEditorVisible;
  }

  render() {
    const game = this.props.game;

    let blockTypeLis: React.ReactNode[] = [];
    let toolTypeLis: React.ReactNode[] = [];
    let moveTypeLis: React.ReactNode[] = [];

    if (game) {
      const blockTypes = game.getBlockTypes();

      blockTypeLis = blockTypes.map((blockType, index) => {
        if (blockType.hideFromToolbox) return null;

        return (
          <li key={index}
            title={blockType.name}
            onClick={() => this.blockTypeClick(index)}
            className={index === this.state.blockTypeIndex ? 'selected' : ''}
            style={blockType.textures.side ? { backgroundImage: "url('" + blockType.textures.side + "')" } : {}}>
          </li>
        );
      });

      const toolTypes = game.getAvailableTools();

      toolTypeLis = toolTypes.map((toolType, index) => {
        return (
          <li key={index}
            title={toolType.name}
            onClick={() => this.switchTool(toolType.type)}
            className={toolType.type === this.state.toolType ? 'selected' : ''}
            style={{ backgroundImage: "url('" + toolType.icon + "')" }}>
          </li>
        );
      });

      moveTypeLis = MoveTypes.map(moveType => {
        return (
          <li key={moveType.type}
            title={moveType.name}
            onClick={() => this.switchMove(moveType.type)}
            className={moveType.type === this.state.moveType ? 'selected' : ''}
            style={{ backgroundImage: "url('" + moveType.icon + "')" }}>
          </li>
        );
      });
    }

    return (
      <div className="toolBox">
        <CodeEditor visible={this.state.codeEditorVisible} scriptStorage={scriptStorage} />

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
          <div><a href="http://chrisdell.info/web-blocks-tutorial-1" target="_blank">Tutorial 1</a></div>
          <div><a href="http://chrisdell.info/web-blocks-tutorial-2" target="_blank">Tutorial 2</a></div>
        </div>
      </div>
    );
  }
}

export default ToolBox;
