setInterval(function() {
  var pos = getPosition();
  setBlock(pos.x,pos.y,pos.z,1);
},200);
