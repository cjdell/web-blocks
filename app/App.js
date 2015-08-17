require('whatwg-fetch');
require('es6-promise').polyfill();

var DesktopPlatform = require('./DesktopPlatform');
var CardboardPlatform = require('./CardboardPlatform');
var Game = require('./Game').default.NewGame;

function App() {
  var platform = null;
  var game = null;

  function init(container) {
    if (detectmob()) {
      platform = new CardboardPlatform();
    } else {
      platform = new DesktopPlatform();
    }

    platform.init(container);

    game = new Game();

    game.init(platform);

    var ui = platform.getUserInterface();

    if (ui) ui.setGame(game);
  }

  function detectmob() {
    // return true;
    return navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i);
  }

  return {
    init: init
  };
}

module.exports = window.App = App;
