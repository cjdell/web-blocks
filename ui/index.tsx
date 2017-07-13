import React = require('react');
import ReactDOM = require('react-dom');
import BoundScriptBar = require('./BoundScriptBar');
import ToolBox = require('./ToolBox');
const injectTapEventPlugin = require('react-tap-event-plugin');
import MuiThemeProvider   from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme        from 'material-ui/styles/getMuiTheme';
import { lightBaseTheme } from 'material-ui/styles';
import Game               from '../app/Game';

injectTapEventPlugin();

class ViewPort extends React.Component<{ ref: string }, any> {
  render() {
    return (
      <MuiThemeProvider>
        <div className="viewPort">
          <div className="miniConsole">
            <div className="miniConsoleOutput">
              <ul></ul>
            </div>
            <input className="miniConsoleInput" />
          </div>
        </div>
      </MuiThemeProvider>
    );
  }
}

interface AppProps {
  game?: Game;
  scripts: number[];
}

class App extends React.Component<AppProps, any> {
  static childContextTypes = {
    muiTheme: React.PropTypes.object
  };

  constructor() {
    super();

    this.executeBoundScript = this.executeBoundScript.bind(this);
  }

  getChildContext() {
    return {
      muiTheme: getMuiTheme(lightBaseTheme)
    };
  }

  executeBoundScript(key: number) {
    this.props.game.workerInterface.executeBoundScript(key);
  }

  render() {
    return (
      <div className="app">
        <ViewPort
          ref="viewPort" />

        <BoundScriptBar
          scripts={this.props.scripts}
          onExecuteBoundScript={this.executeBoundScript} />

        <ToolBox
          game={this.props.game} />

        <div className="helpBar">
          Keys:
          [WASD]= Walk,
          [SHIFT]= Un/Lock Camera to Mouse,
          [SPACE]= Jump,
          [ESCAPE]= Toggle Code Editor,
          [Enter]= On-screen console
        </div>
      </div>
    );
  }
}

class UserInterface {
  container: HTMLDivElement;
  app: any;

  game: Game;
  scripts: number[] = [];

  init(_container: HTMLDivElement) {
    this.container = _container;

    this.render();
  }

  getViewPort() {
    return ReactDOM.findDOMNode(this.app.refs.viewPort) as HTMLDivElement;
  }

  setGame(game: Game) {
    this.game = game;

    this.game.onBoundScriptsChange(args => {
      this.scripts = args.scripts;

      this.render();
    });

    this.render();
  }

  render() {
    this.app = ReactDOM.render(
      <App game={this.game} scripts={this.scripts} />,
      this.container
    );
  }
}

export default UserInterface;
