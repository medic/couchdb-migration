#!/usr/bin/env node

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

(async () => {
  try {
    const removedNodes = await moveNode();
    for (const node of removedNodes) {
      await removeNode(node);
    }
    await syncShards();
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
