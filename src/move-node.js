const utils = require('./utils');
const moveShard = require('./move-shard');

const moveNode = async (oldNode, newNode) => {
  const shards = await utils.getShards();
  for (const shard of shards) {
    await moveShard.moveShard(shard, newNode);
  }
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
