#!/usr/bin/env node

const [,, toNode, shardMapJson] = process.argv;

const { moveNode, syncShards } = require('../src/move-node');
const { removeNode } = require('../src/remove-node');

const parseNodeMapping = (input) => {
  if (!input) {
    //single node migration with unspecified node
    return;
  } else if (input.startsWith('{')) {
    //multi-node migration with specified node mapping
    //Example input: '{"oldNode":"newNode"}'
    try {
      return JSON.parse(input);
    }
    catch (err) {
      throw new Error(
        `Invalid node mapping. Please specify the node mapping in the format '{"<oldNode>":"<newNode>"}'`
      );
    }
  }
  //single node migration with specified node
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
