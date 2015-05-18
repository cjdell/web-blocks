var React = require('react');

function UserInterface() {
  var app = null;

  function init(container) {
    app = React.render(<App />, container);
  }

  function getViewPort() {
    return app.refs.viewPort.getDOMNode();
  }

  return {
    init: init,
    getViewPort: getViewPort
  };
}

module.exports = UserInterface;

var App = React.createClass({
  getInitialState: function() {
    return {};
  },
  render: function() {
    return (
    <div className="app">
      <ViewPort ref="viewPort"></ViewPort>
      <ToolBox></ToolBox>
    </div>
    );
  }
});

var ViewPort = React.createClass({
  getInitialState: function() {
    return {};
  },
  render: function() {
    return (
    <div className="viewPort"></div>
    );
  }
});

var ToolBox = React.createClass({
  getInitialState: function() {
    var blockTypes = [{
      name: 'Stone'
    }, {
      name: 'Grass'
    }];

    return {
      blockTypes: blockTypes,
      blockTypeIndex: 0
    };
  },
  blockTypeClick: function(blockTypeIndex) {
    this.setState({ blockTypeIndex: blockTypeIndex });
  },
  render: function() {
    var lis = this.state.blockTypes.map(function(blockType, index) {
      return (
      <li onClick={this.blockTypeClick.bind(this, index)}
          className={index === this.state.blockTypeIndex ? 'selected' : ''}>
        {blockType.name}
      </li>
      );
    }, this);

    return (
    <div className="toolBox">
      <ul>{lis}</ul>
    </div>
    );
  }
});
