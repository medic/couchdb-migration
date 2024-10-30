#!/usr/bin/env node
const [,, toNode] = process.argv;

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

const getStdin = () => {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      return resolve('');
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', err => reject(err));
  });
};

const parseShardMapJsonInput = async () => {
  try {
    const input = await getStdin();
    if (input.trim()) {
      return JSON.parse(input.trim());
    }
  } catch (err) {
    console.warn('Failed to parse shard mapping JSON from stdin');
  }
  return;
};

(async () => {
  try {
    const parsedToNode = parseNodeMapping(toNode);
    const shardMapJson = await parseShardMapJsonInput();

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
