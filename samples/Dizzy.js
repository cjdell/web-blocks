var angle = 0;
setInterval(function() {
  angle = angle + 0.01;
  var x = 100 + Math.sin(angle) * 10;
  var z = 100 + Math.cos(angle) * 10;
  setPosition(x, 10, z);
  setTarget(angle * (180 / Math.PI), 0);
}, 10);
