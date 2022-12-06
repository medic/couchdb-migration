const utils = require('./utils');

const generateMatrix = async () => {
  const shards = await utils.getShards();
  const nodes = await utils.getNodes();
  return Object.assign(...shards.map((shard, idx) => ({ [shard]: nodes[idx % nodes.length] })));
};

module.exports = {
  generateMatrix,
};
