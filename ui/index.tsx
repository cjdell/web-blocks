import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import BoundScriptBar from './BoundScriptBar';
import ToolBox from './ToolBox';
import Game from '../app/Game';

class ViewPort extends React.Component<{ onViewPort: (el: HTMLDivElement | null) => void }, object> {
  render() {
    return (
      <div className="viewPort" ref={el => { this.props.onViewPort(el); }}>
        <div className="miniConsole">
          <div className="miniConsoleOutput">
            <ul></ul>
          </div>
          <input className="miniConsoleInput" />
        </div>
      </div>
    );
  }
}

interface AppProps {
  game?: Game;
  scripts: number[];
  onViewPort: (el: HTMLDivElement | null) => void;
}

class App extends React.Component<AppProps, object> {
  constructor(props: AppProps) {
    super(props);

    this.executeBoundScript = this.executeBoundScript.bind(this);
  }

  executeBoundScript(key: number) {
    const game = this.props.game;

    if (game) game.workerInterface.executeBoundScript(key);
  }

  render() {
    return (
      <div className="app">
        <ViewPort
          onViewPort={this.props.onViewPort} />

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
  private container: HTMLDivElement;
  private root: Root | null = null;
  private viewPort: HTMLDivElement | null = null;

  private game: Game | null = null;
  private scripts: number[] = [];

  private onViewPort = (el: HTMLDivElement | null) => {
    this.viewPort = el;
  };

  init(_container: HTMLDivElement) {
    this.container = _container;

    this.render();
  }

  getViewPort() {
    // The first render is flushed synchronously (see render), so the view
    // port node is available as soon as init() returns.
    return this.viewPort as HTMLDivElement;
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
    if (!this.root) {
      // Flush the initial mount synchronously: DesktopPlatform reads the
      // viewPort DOM node immediately after init() returns.
      this.root = createRoot(this.container);

      flushSync(() => {
        this.root.render(
          <App game={this.game ?? undefined} scripts={this.scripts} onViewPort={this.onViewPort} />
        );
      });

      return;
    }

    this.root.render(
      <App game={this.game ?? undefined} scripts={this.scripts} onViewPort={this.onViewPort} />
    );
  }
}

export default UserInterface;
