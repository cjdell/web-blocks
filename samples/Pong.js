let ball = { x: 0, y: 0 };
let edge = { x: 100, y: 6, z: 100 };
let size = { x: 24, y: 10 };
let direction = { x: 1, y: 1 };
let batPos = 0;
let batSize = 4;
let playerStartPos = getPosition();
let interval = 200;

setBlocks(edge.x - 1, edge.y - 1, edge.z, edge.x + size.x, edge.y + size.y, edge.z, Stone);
setBlocks(edge.x, edge.y, edge.z, edge.x + size.x - 1, edge.y + size.y - 1, edge.z, Air);

function tick() {
  // Old ball
  setBlock(edge.x + ball.x, edge.y + ball.y, edge.z, Air);

  ball.x += direction.x;
  ball.y += direction.y;

  if (ball.x >= size.x - 1) direction.x *= -1;
  if (ball.y >= size.y - 1) direction.y *= -1;

  if (ball.x <= 0) direction.x *= -1;
  if (ball.y <= 0 && ball.x >= batPos - 1 && ball.x < batPos + batSize - 1) {
    direction.y *= -1;
    interval -= 5;
  }

  if (ball.y < 0) { 
    ball = { x: 0, y: 0 };
    direction = { x: 1, y: 1 };
    interval = 200;
  }

  batPos = (getPosition().x - playerStartPos.x) * 3;

  // Ball
  setBlock(edge.x + ball.x, edge.y + ball.y, edge.z, Melon);

  // Bat range
  setBlocks(edge.x, edge.y - 1, edge.z, edge.x + size.x - 1, edge.y - 1, edge.z, Colour, 0);

  // Bat
  setBlocks(edge.x + batPos, edge.y - 1, edge.z, edge.x + batPos + batSize - 1, edge.y - 1, edge.z, Colour, 80);

  setTimeout(tick, interval);
}

tick();
