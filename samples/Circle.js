for (var x = -20; x < 20; x++) {
  for (var z = -20; z < 20; z++) {
    if (Math.sqrt(x * x + z * z) < 19) {
      setBlocks(x + 100, 0, z + 100, x + 100, 10, z + 100, 1);
    }
  }
}
