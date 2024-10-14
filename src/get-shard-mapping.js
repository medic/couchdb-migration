const utils = require('./utils');

const get_shard_mapping = async () => {
  try {
    const allDbs = await utils.getDbs();
    const shardMap = {};

    for (const db of allDbs) {
      const url = await utils.getUrl(`${db}/_shards`);
      const shardInfo = await utils.request({ url });

      for (const [shardRange, nodeList] of Object.entries(shardInfo.shards)) {
        // In n=1 setup, there should be only one node per shard range.
        // We will have to revisit this if we ever support n>1.
        if (nodeList.length !== 1) {
          console.warn(`Unexpected number of nodes for range ${shardRange}: ${nodeList.length}`);
        }
        shardMap[shardRange] = nodeList[0];
      }
    }

    return JSON.stringify(shardMap);
  } catch (err) {
    console.error('Error getting shard mapping:', err);
    throw new Error('Failed to get shard mapping');
  }
};

module.exports = {
  get_shard_mapping
};
