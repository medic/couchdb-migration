const utils = require('./utils');
const moveShard = require('./move-shard');

const moveNode = async (toNode) => {
  const removedNodes = [];

  if (typeof toNode === 'object') {
    // Migration with specified oldNode:newNode mapping for when migrating multiple nodes one by one
    const [oldNode, newNode] = Object.entries(toNode)[0];
    const shards = await utils.getShards();
    for (const shard of shards) {
      if (shard.nodes.includes(oldNode)) {
        const oldNodes = await moveShard.moveShard(shard, newNode);
        removedNodes.push(...oldNodes);
      }
    }
  } else {
    // Single node migration
    if (!toNode) {
      const nodes = await utils.getNodes();
      if (nodes.length > 1) {
        throw new Error('More than one node found. Please specify a node mapping in the format oldNode:newNode.');
      }
      toNode = nodes[0];
    }

    const shards = await utils.getShards();
    for (const shard of shards) {
      const oldNodes = await moveShard.moveShard(shard, toNode);
      removedNodes.push(...oldNodes);
    }
  }

  return [...new Set(removedNodes)];
};

const syncShards = async () => {
  const allDbs = await utils.getDbs();
  for (const db of allDbs) {
    await utils.syncShards(db);
  }
};

module.exports = {
  moveNode,
  syncShards
};
