function WorkerInterface() {
  var geoWorker = new Worker('build/worker.js');

  var initCallback = null;
  var getBlockCallback = {};
  var getPartitionCallback = {};

  var changeListener = null;

  function init() {
    return new Promise(function(resolve, reject) {
      initCallback = function(data) {
        return resolve(data);
      };

      geoWorker.postMessage({
        action: 'init'
      });
    });
  }

  function getBlock(pos) {
    return new Promise(function(resolve, reject) {
      var key = pos.x + '-' + pos.y + '-' + pos.z;

      getBlockCallback[key] = function(data) {
        getBlockCallback[key] = null;
        return resolve(data);
      };

      geoWorker.postMessage({
        action: 'getBlock',
        pos: pos
      });
    });
  }

  function setBlocks(start, end, type, update) {
    //console.log('setBlocks', start, end, type, update);
    geoWorker.postMessage({
      action: 'setBlocks',
      start: start,
      end: end,
      type: type,
      update: update
    });
  }

  function addBlock(position, side, type) {
    geoWorker.postMessage({
      action: 'addBlock',
      position: position,
      side: side,
      type: type
    });
  }

  function getPartition(index) {
    //console.log('getPartition', index);

    return new Promise(function(resolve, reject) {
      getPartitionCallback[index] = function(data) {
        getPartitionCallback[index] = null;
        return resolve(data);
      };

      geoWorker.postMessage({
        action: 'getPartition',
        index: index
      });
    });
  }

  geoWorker.onmessage = function(e) {
    //console.log(e.data);

    if (e.data.action === 'init') {
      return initCallback(e.data);
    }

    if (e.data.action === 'getBlock') {
      var key = e.data.pos.x + '-' + e.data.pos.y + '-' + e.data.pos.z;
      return getBlockCallback[key] ? getBlockCallback[key](e.data) : null;
    }

    if (e.data.action === 'getPartition') {
      return getPartitionCallback[e.data.index] ? getPartitionCallback[e.data.index](e.data) : null;
    }

    if (e.data.action === 'update') {
      if (changeListener) changeListener(e.data);
    }
  };

  function addChangeListener(listener) {
    changeListener = listener;
  }

  function exposeWindowMethods() {
    self.getBlock = function(x, y, z) {
      return getBlock(new THREE.Vector3(x, y, z))
      .then(function(result) {
        return result.type;
      });
    };

    self.setBlocks = function(x1, y1, z1, x2, y2, z2, type) {
      setBlocks(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2), type, true);
    };
  }

  exposeWindowMethods();

  return {
    init: init,
    getBlock: getBlock,
    setBlocks: setBlocks,
    addBlock: addBlock,
    getPartition: getPartition,
    addChangeListener: addChangeListener
  };
}

module.exports = WorkerInterface;

