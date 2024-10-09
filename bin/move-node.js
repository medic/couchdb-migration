#!/usr/bin/env node

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

(async () => {
  try {
    let toNode;
    if (process.argv.length > 2) {
      // Parse command-line argument for node mapping in the following format:
      // move-node.js oldNode:newNode
      const arg = process.argv[2];
      if (arg.includes(':')) {
        const [oldNode, newNode] = arg.split(':');
        toNode = { [oldNode]: newNode };
      } else {
        // Single node migration with target node specified
        toNode = arg;
      }
    }

    const removedNodes = await moveNode(toNode);
    for (const node of removedNodes) {
      await removeNode(node);
    }
    await syncShards();
    console.log('Node moved successfully');
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
