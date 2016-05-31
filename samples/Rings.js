for (var x = 0; x < 60; x++) {
  var x_minus_30_squared = Math.pow(x - 30, 2);
  for (var z = 0; z < 60; z++) {
    var r = Math.sqrt(x_minus_30_squared + Math.pow(z - 30, 2));

    if (r > 27 && r <= 30) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, BlockType.Stone);
    }

    if (r > 21 && r <= 24) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, BlockType.Grass);
    }

    if (r > 15 && r <= 18) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, BlockType.Water);
    }
  }
}