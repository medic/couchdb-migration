#!/usr/bin/env node

const [,, toNode, shardMap] = process.argv;

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

const parseNodeMapping = (input) => {
  if (!input) {
    // Single node migration with unspecified node
    return;
  }
  try {
    // Multi-node migration with specified node mapping
    // Example input: '{"oldNode":"newNode"}'
    return JSON.parse(input);
  } catch (err) {
    // Single node migration with specified node
    console.warn('Failed to parse node mapping JSON. Defaulting to single node mapping');
    return input;
  }
};

const parseShardMapJsonInput = (input) => {
  if (!input) {
    return;
  }
  try {
    return JSON.parse(input);
  } catch (err) {
    console.error('Failed to parse JSON input:', input);
    throw new Error('Invalid JSON input');
  }
};

(async () => {
  try {
    const parsedToNode = parseNodeMapping(toNode);
    const shardMapJson = parseShardMapJsonInput(shardMap);

    const movedNodes = await moveNode(parsedToNode, shardMapJson);
    console.log('Node moved successfully');

    for (const node of movedNodes) {
      await removeNode(node);
    }
    await syncShards();
    console.log('Removed nodes:', movedNodes);
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
