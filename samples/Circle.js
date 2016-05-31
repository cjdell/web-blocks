for (var x = -20; x < 20; x++) {
  var x_squared = x * x;
  for (var z = -20; z < 20; z++) {
    if (Math.sqrt(x_squared + z * z) < 19) {
      setBlocks(x + 100, 0, z + 100, x + 100, 10, z + 100, BlockType.Stone);
    }
  }
}
