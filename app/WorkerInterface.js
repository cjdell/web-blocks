function WorkerInterface() {
  var geoWorker = new Worker('build/worker.js');

  var callbacks = {};
  var changeListener = null;
  var lastId = 0;

  function invoke(action, data) {
    return new Promise(function(resolve, reject) {
      if (typeof action !== 'string') return reject(new Error('Invalid action'));

      var invocation = {
        action: action,
        id: lastId++,
        data: data
      };

      callbacks[invocation.id] = resolve;

      geoWorker.postMessage(invocation);
    });
  }

  function init() {
    return invoke('init');
  }

  function getBlock(pos) {
    return invoke('getBlock', { pos: pos });
  }

  function setBlocks(start, end, type, colour, update) {
    return invoke('setBlocks', {
      start: start,
      end: end,
      type: type,
      colour: colour,
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
    return invoke('getPartition', { index: index });
  }

  geoWorker.onmessage = function(e) {
    if (typeof e.data.id === 'number') {
      return callbacks[e.data.id](e.data.data);
    }

    if (e.data.action === 'update') {
      if (changeListener) changeListener(e.data);
    }
  };

  function addChangeListener(listener) {
    changeListener = listener;
  }

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
