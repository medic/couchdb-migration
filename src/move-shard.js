const utils = require('./utils');

const validateCall = async (shard, toNode) => {
  if (!shard) {
    throw new Error('Please specify shard');
  }
  if (!toNode) {
    throw new Error('Please specify destination node');
  }

  // check that shard exists?

  const membership = await utils.getMembership();
  if (!membership.cluster_nodes.includes(toNode)) {
    console.warn(`Node ${toNode} is unknown.`);
  }
};

const updateDbMetadata = (metadata, shard, toNode) => {
  const fromNodes = metadata.by_range[shard];
  if (!fromNodes || fromNodes.includes(toNode)) {
    return false;
  }

  metadata.by_range[shard] = [toNode];

  metadata.by_node[toNode] = metadata.by_node[toNode] || [];
  metadata.by_node[toNode].push(shard);

  fromNodes.forEach(fromNode => {
    metadata.by_node[fromNode] = metadata.by_node[fromNode].filter(shardName => shardName !== shard);
    if (!metadata.by_node[fromNode].length) {
      delete metadata.by_node[fromNode];
    }
    metadata.changelog.push(['remove', shard, fromNode]);
  });
  metadata.changelog.push(['add', shard, toNode]);

  return true;
};

const moveShard = async (shard, toNode) => {
  await validateCall(shard, toNode);

  const dbs = await utils.getDbs();
  for (const dbName of dbs) {
    const metadata = await utils.getDbMetadata(dbName);
    const changed = updateDbMetadata(metadata, shard, toNode);
    changed && await utils.updateDbMetadata(dbName, metadata);
  }
};

module.exports = {
  moveShard,
};
