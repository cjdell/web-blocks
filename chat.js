var _ = require('underscore');

function NewChatClient(a, b) {
  function open() {
    console.log('open', b);
  }

  return {
    open: open
  };
}

function NewThreadClient(a, b) {
  var chatClient = NewChatClient.apply(this, arguments);

  function open() {
    console.log('OVERRIDEN');
  }

  function getThreads() {
    console.log('getThreads', a, b);
  }

  return _.extend({}, chatClient, {
    // open: open,
    getThreads: getThreads
  });
}

var threadClient = NewThreadClient('hello', 'world');

threadClient.open();
threadClient.getThreads();
