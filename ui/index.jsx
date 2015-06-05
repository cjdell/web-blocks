var React = require('react');

var ToolBox = require('./ToolBox.jsx');

function UserInterface() {
  var app = null;

  function init(container) {
    app = React.render(<App />, container);
  }

  function getViewPort() {
    return app.refs.viewPort.getDOMNode();
  }

  function setGame(game) {
    app.setGame(game);
  }

  return {
    init: init,
    getViewPort: getViewPort,
    setGame: setGame
  };
}

module.exports = UserInterface;

var App = React.createClass({
  getInitialState: function() {
    return {};
  },
  setGame: function(game) {
    this.setProps({ game: game });
  },
  render: function() {
    return (
    <div className="app">
      <ViewPort ref="viewPort"></ViewPort>
      <ToolBox game={this.props.game}></ToolBox>
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
    <div className="viewPort">
      <div className="helpBar">Keys: [W] = Forwards, [S] = Backwards, [A] = Move Left, [D] = Move Right, Arrow Keys = Look around, [ESCAPE] = Toggle Code Editor</div>
    </div>
    );
  }
});

