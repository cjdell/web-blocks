const size = 20;
const pos = { x: 100, y: 30, z: 100 };

function draw() {
  undo(2);

  const ppos = getPosition();

  pos.x = pos.x + (ppos.x - pos.x) * 0.01;
  pos.z = pos.z + (ppos.z - pos.z) * 0.01;

  setBlocks(pos.x, pos.y, pos.z,
    pos.x + size, pos.y, pos.z + size,
    Stone);
  setBlocks(pos.x + 8, pos.y, pos.z + 8,
    pos.x + size - 8, pos.y - 30, pos.z + size - 8,
    Glass);

  setGravity(9.8);

  if (ppos.x >= pos.x && ppos.x <= pos.x + size) {
    if (ppos.z >= pos.z && ppos.z <= pos.z + size) {
      setGravity(-5);
    }
  }
}

setInterval(draw, 100);