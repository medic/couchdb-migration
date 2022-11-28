const [,, fromNode, toNode ] = process.argv;

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

(async () => {
  try {
    await moveNode(fromNode, toNode);
    await removeNode(fromNode);
    await syncShards();
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
