var React = require('react');
var ReactDOM = require('react-dom');
var mui = require('material-ui');
var ThemeManager = require('material-ui/lib/styles/theme-manager');
const LightRawTheme = require('material-ui/lib/styles/raw-themes/light-raw-theme');

var Colors = mui.Styles.Colors;
var injectTapEventPlugin = require('react-tap-event-plugin');

// ThemeManager.setTheme(ThemeManager.types.LIGHT);

injectTapEventPlugin();

var ToolBox = require('./ToolBox.jsx');

function UserInterface() {
  var container;
  var app;

  function init(_container) {
    container = _container;
    app = ReactDOM.render(<App />, container);
  }

  function getViewPort() {
    return ReactDOM.findDOMNode(app.refs.viewPort);
  }

  function setGame(game) {
    app = ReactDOM.render(<App game={game} />, container);
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

  childContextTypes: {
    muiTheme: React.PropTypes.object
  },

  getChildContext() {
    return {
      muiTheme: ThemeManager.getMuiTheme(LightRawTheme)
    };
  },

  componentWillMount() {
    //ThemeManager.setPalette({
    //  accent1Color: Colors.deepOrange500
    //});
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
