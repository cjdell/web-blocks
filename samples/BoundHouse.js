// Press "6" to make a house where you are!
bindScript(function () {
  const pos = getPosition();

  setBlocks(pos.x - 10, pos.y, pos.z - 10, pos.x + 10, pos.y + 10, pos.z + 10, Stone);    // Cube
  setBlocks(pos.x - 9, pos.y + 1, pos.z - 9, pos.x + 9, pos.y + 10, pos.z + 9, Air);      // Hollow
  setBlocks(pos.x - 2, pos.y + 1, pos.z + 10, pos.x + 2, pos.y + 8, pos.z + 10, Air);     // Door
  setBlocks(pos.x - 8, pos.y + 5, pos.z + 10, pos.x - 5, pos.y + 8, pos.z + 10, Glass);   // Left window
  setBlocks(pos.x + 5, pos.y + 5, pos.z + 10, pos.x + 8, pos.y + 8, pos.z + 10, Glass);   // Right window

  // Roof
  for (let x = 0; x < 11; x++) {
    setBlocks(pos.x - 10 + x, pos.y + 10 + x, pos.z - 10, pos.x - 10 + x, pos.y + 10 + x, pos.z + 10, Stone);
    setBlocks(pos.x + 10 - x, pos.y + 10 + x, pos.z - 10, pos.x + 10 - x, pos.y + 10 + x, pos.z + 10, Stone);
  }

  setPosition(pos.x, pos.y + 1, pos.z);

}, 6);
