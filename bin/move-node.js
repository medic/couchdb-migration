#!/usr/bin/env node

const [,, toNode, shardMapJson] = process.argv;

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

const parseNodeMapping = function (input) {
  if (!input) {
    return undefined;
  } else if (input.startsWith('{')) {
    return JSON.parse(input);
  } else if (input.includes(':')) {
    const [oldNode, newNode] = input.split(':');
    return { [oldNode]: newNode };
  }
  return input;
};

(async () => {
  try {
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
