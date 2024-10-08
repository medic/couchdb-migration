const utils = require('./utils');
const moveShard = require('./move-shard');

const moveNode = async (toNode) => {
  const removedNodes = [];

  if (typeof toNode === 'object') {
    // Multiple node migration
    const shards = await utils.getShards();
    for (const [oldNode, newNode] of Object.entries(toNode)) {
      for (const shard of shards) {
        if (shard.nodes.includes(oldNode)) {
          const oldNodes = await moveShard.moveShard(shard, newNode);
          removedNodes.push(...oldNodes);
        }
      }
    }
  } else {
    // Single node migration
    if (!toNode) {
      const nodes = await utils.getNodes();
      if (nodes.length > 1) {
        throw new Error('More than one node found. Please specify an argument providing a m');
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
