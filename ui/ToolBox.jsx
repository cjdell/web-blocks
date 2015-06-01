var React = require('react');

var ScriptStorage = require('../app/ScriptStorage');

var CodeEditor = require('./CodeEditor.jsx');

var scriptStorage = new ScriptStorage();

scriptStorage.load();

var ToolBox = React.createClass({
  getInitialState: function() {
    return {
      blockTypeIndex: 1,
      codeEditorVisible: false
    };
  },
  blockTypeClick: function(blockTypeIndex) {
    this.setState({ blockTypeIndex: blockTypeIndex });

    this.props.game.setBlockType(blockTypeIndex);
  },
  toggleCodeEditor: function() {
    this.setState({ codeEditorVisible: !this.state.codeEditorVisible });
  },
  componentDidMount: function() {
    document.addEventListener('keyup', function() {
      // Toggle code editor on escape key
      if (event.keyCode === 27) this.toggleCodeEditor();
    }.bind(this), false);
  },
  componentDidUpdate: function() {
    window.blockMovement = this.state.codeEditorVisible;
  },
  render: function() {
    var lis = [];

    if (this.props.game) {
      var blockTypes = this.props.game.getBlockTypes();

      lis = blockTypes.map(function(blockType, index) {
        return (
        <li key={index}
            onClick={this.blockTypeClick.bind(this, index)}
            className={index === this.state.blockTypeIndex ? 'selected' : ''}>
          {blockType.name}
        </li>
        );
      }, this);
    }

    return (
    <div className="toolBox">
      <CodeEditor key="codeEditor" visible={this.state.codeEditorVisible} scriptStorage={scriptStorage} />
      <ul>
        <li onClick={this.toggleCodeEditor}>&lt;Code&gt;</li>
      </ul>
      <ul>{lis}</ul>
    </div>
    );
  }
});

module.exports = ToolBox;
