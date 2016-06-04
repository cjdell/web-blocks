// Press "6" to make a pillar 10 blocks away, 5 blocks high!
bindScript(function () {
    var p = getPosition();
    setBlocks(p.x, p.y, p.z - 10, p.x, p.y + 5, p.z - 10, BlockType.Stone, 1);
}, 6);