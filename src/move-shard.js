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

  metadata.by_range[shard] = [...fromNodes, toNode];
  metadata.by_node[toNode] = metadata.by_node[toNode] || [];
  metadata.by_node[toNode].push(shard);
  metadata.changelog.push(['add', shard, toNode]);

  fromNodes.forEach(fromNode => {
    metadata.by_node[fromNode] = metadata.by_node[fromNode].filter(shardName => shardName !== shard);
    if (!metadata.by_node[fromNode].length) {
      delete metadata.by_node[fromNode];
    }
    const idx = metadata.by_range[shard].indexOf(fromNode);
    metadata.by_range[shard].splice(idx, 1);
    metadata.changelog.push(['remove', shard, fromNode]);
  });

  return fromNodes;
};

const moveShard = async (shard, toNode, dbName = null) => {
  await validateCall(shard, toNode);
  const removedNodes = [];

  const dbs = dbName ? [dbName] : await utils.getDbs();
  for (const dbName of dbs) {
    const metadata = await utils.getDbMetadata(dbName);
    const oldNodes = updateDbMetadata(metadata, shard, toNode);
    if (oldNodes) {
      await utils.updateDbMetadata(dbName, metadata);
      removedNodes.push(...oldNodes);
    }
  }
  return [...new Set(removedNodes)];
};

module.exports = {
  moveShard,
};
