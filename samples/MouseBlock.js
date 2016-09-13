// Now we can press 1 to delete the block our mouse is on!
bindScript(function () {
  var p = getMousePosition().pos;
  setBlock(p.x, p.y, p.z, Air);
}, 1);