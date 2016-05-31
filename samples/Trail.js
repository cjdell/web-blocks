setInterval(function() {
  var pos = getPosition();
  setBlock(pos.x,pos.y,pos.z,BlockType.Stone);
},200);
