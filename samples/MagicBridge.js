setInterval(function () {
  var pos = getPosition();
  setBlock(pos.x, pos.y - 1, pos.z, Colour, pos.x * pos.z);
}, 20);
