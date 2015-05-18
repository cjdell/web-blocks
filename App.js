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

  return {
    init: init
  };
}

module.exports = window.Game = App;
