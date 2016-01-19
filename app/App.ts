"use strict";
/// <reference path="../typings/tsd.d.ts" />
require('whatwg-fetch');
require('es6-promise').polyfill();

import DesktopPlatform from './DesktopPlatform';
import CardboardPlatform from './CardboardPlatform';
import Game from './Game';

const App = () => {
  let platform: CardboardPlatform | DesktopPlatform;
  let game: Game;

  const detectmob = () => {
    // return true;
    return navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i);
  };

  const init = (container: HTMLDivElement) => {
    if (detectmob()) {
      platform = new CardboardPlatform(container);
    } else {
      platform = new DesktopPlatform(container);
    }

    game = new Game(platform);

    const ui = platform.getUserInterface();

    if (ui) ui.setGame(game);
  };

  return {
    init
  };
};

export = (window as any).App = App;
