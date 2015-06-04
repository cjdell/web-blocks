function Api(workerInterface) {
  var help = [
    'Here you can type JavaScript commands, try typing 1+1',
    'To see some awesome commands, click the "Script" tab and load a sample program! :-)'
  ].join('\n');

  var hi = 'Hi there!';

  function setBlocks(x1, y1, z1, x2, y2, z2, type) {
    workerInterface.setBlocks(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2), type, true);
  }

  function getBlock(x, y, z) {
    return getBlock(new THREE.Vector3(x, y, z))
    .then(function(result) {
      return result.type;
    });
  }

  return {
    help: help,
    hi: hi,
    setBlocks: setBlocks,
    getBlock: getBlock
  };
}

module.exports = Api;
