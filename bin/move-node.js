#!/usr/bin/env node

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

(async () => {
  try {
    let toNode;
    if (process.argv.length > 2) {
      // Parse command-line arguments for node mapping in the following format:
      // move-node.js oldNode1:newNode1 oldNode2:newNode2 oldNode3:newNode3
      toNode = process.argv.slice(2).reduce((nodeMapping, arg) => {
        const [oldNode, newNode] = arg.split(':');
        nodeMapping[oldNode] = newNode;
        return nodeMapping;
      }, {});
    }

    const removedNodes = await moveNode(toNode);
    for (const node of removedNodes) {
      await removeNode(node);
    }
    await syncShards();
    console.log('Node(s) moved successfully');
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
