for (var x = 0; x < 60; x++) {
  for (var z = 0; z < 60; z++) {
    var r = Math.sqrt(Math.pow(x - 30, 2) + Math.pow(z - 30, 2));

    if (r <= 30 && r > 27) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, 1);
    }

    if (r <= 24 && r > 21) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, 2);
    }
  }
}
