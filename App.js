var DesktopPlatform = require('./DesktopPlatform');
var CardboardPlatform = require('./CardboardPlatform');
var Game = require('./Game');

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

    console.log(ui);

    //console.log('getBlockTypes', game.getBlockTypes());
  }

  function detectmob() {
    return navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i);
  }

  return {
    init: init
  };
}

module.exports = window.App = App;
