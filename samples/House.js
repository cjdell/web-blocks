setBlocks(90,0,90,110,10,110,BlockType.Stone);
setBlocks(91,1,91,109,10,109,BlockType.Air);
setBlocks(98,1,110,102,8,110,BlockType.Air);
setBlocks(92,5,110,95,8,110,BlockType.Air);
setBlocks(105,5,110,108,8,110,BlockType.Air);
for (var x = 0; x < 11; x++) {
  setBlocks(90 + x, 10 + x, 90, 90 + x, 10 + x, 110, BlockType.Stone);
  setBlocks(110 - x, 10 + x, 90, 110 - x, 10 + x, 110, BlockType.Stone);
}
