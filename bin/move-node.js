#!/usr/bin/env node

const [,, toNode, shardMapJson] = process.argv;

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

const parseNodeMapping = function (input) {
  if (input.startsWith('{')) {
    return JSON.parse(input);
  } else if (input.includes(':')) {
    const [oldNode, newNode] = input.split(':');
    return { [oldNode]: newNode };
  }
  return input;
};

(async () => {
  try {
    if (!toNode) {
      console.error('Please provide the target node or node mapping.');
      console.error('Usage for single-node migration: move-node newNode');
      console.error('Usage for multi-node migration:');
      console.error(
        '  move-node \'{"oldNode":"newNode"}\'' +
        '\'{"shards":["shard1","shard2"],"nodes":{"shard1":["oldNode"],"shard2":["oldNode"]}}\'');
      console.error('  OR');
      console.error(
        '  move-node oldNode:newNode \'' +
        '{"shards":["shard1","shard2"],"nodes":{"shard1":["oldNode"],"shard2":["oldNode"]}}\'');
      process.exit(1);
    }

    const parsedToNode = parseNodeMapping(toNode);

    const removedNodes = await moveNode(parsedToNode, shardMapJson);
    console.log('Node moved successfully');

    for (const node of removedNodes) {
      await removeNode(node);
    }
    await syncShards();
    console.log('Removed nodes:', removedNodes);
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
