import DesktopPlatform from './DesktopPlatform';
import Game from './Game';

const App = () => {
  let platform: DesktopPlatform;
  let game: Game;

  const init = (container: HTMLDivElement) => {
    platform = new DesktopPlatform(container);

    game = new Game(platform);

    return game.init().then(() => {
      const ui = platform.getUserInterface();

      if (ui) ui.setGame(game);
    });
  };

  return {
    init,
  };
};

export default ((globalThis as any).App = App);
