setInterval(function() {
  var pos = getPosition();
  setBlocks(pos.x - 1, pos.y, pos.z - 1, pos.x + 1, pos.y + 1, pos.z + 1, Air);
}, 20);
