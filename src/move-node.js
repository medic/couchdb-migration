const utils = require('./utils');
const moveShard = require('./move-shard');

const moveNode = async (toNode) => {
  const removedNodes = [];

  if (!toNode) {
    const nodes = await utils.getNodes();
    if (nodes.length > 1) {
      throw new Error('More than one node found.');
    }
    toNode = nodes[0];
  }

  const shards = await utils.getShards();
  for (const shard of shards) {
    const oldNodes = await moveShard.moveShard(shard, toNode);
    removedNodes.push(...oldNodes);
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
