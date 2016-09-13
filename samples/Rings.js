// Make 3 circles one side another inside another
for (var x = 0; x < 60; x++) {
  var x_minus_30_squared = Math.pow(x - 30, 2);
  for (var z = 0; z < 60; z++) {
    var radius = Math.sqrt(x_minus_30_squared + Math.pow(z - 30, 2));

    if (radius > 27 && radius <= 30) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, Stone);
    }

    if (radius > 21 && radius <= 24) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, Grass);
    }

    if (radius > 15 && radius <= 18) {
      setBlocks(x + 20, 0, z + 20, x + 20, 20, z + 20, Water);
    }
  }
}