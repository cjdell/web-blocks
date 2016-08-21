for (var x = 0; x < 16; x++) {
  for (var y = 0; y < 16; y++) {
    var colour = x * y;
    setBlock(100 + x, y, 100, BlockType.Colour, colour);
  }
}
