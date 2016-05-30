var angle = 0;
setInterval(function() {
  angle = angle + 0.01;
  var x = 100 + Math.sin(angle) * 10;
  var z = 100 + Math.cos(angle) * 10;
  setPosition(x, 10, z);
  setDirection(0, -angle * (180 / Math.PI));
}, 10);
