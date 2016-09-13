// Every 5th of a second (200ms) place a block at your location
setInterval(function () {
  var pos = getPosition();
  setBlock(pos.x, pos.y, pos.z, Stone);
}, 200);
