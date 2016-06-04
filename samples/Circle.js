// Make a circle with a radius of 20
var radius = 20;
// Make it 10 blocks tall
var height = 10;
// Find the distance between x and y using x^2 and z^2
var distance = function (xs, zs) { return Math.sqrt(xs, zs); };

for (var x = -radius; x < radius; x++) {
  var x_squared = x * x;
  for (var z = -radius; z < radius; z++) {
    if (distance(x_squared, z * z) < radius - 1) {
      setBlocks(x + 100, 0, z + 100, x + 100, height, z + 100, BlockType.Stone);
    }
  }
}
