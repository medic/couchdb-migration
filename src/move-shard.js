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

  return fromNodes;
};

const removeNodeFromMetadata = (shard, metadata, fromNodes) => {
  fromNodes.forEach(fromNode => {
    metadata.by_node[fromNode] = metadata.by_node[fromNode].filter(shardName => shardName !== shard);
    if (!metadata.by_node[fromNode].length) {
      delete metadata.by_node[fromNode];
    }
    const idx = metadata.by_range[shard].indexOf(fromNode);
    metadata.by_range[shard].splice(idx, 1);
    metadata.changelog.push(['remove', shard, fromNode]);
  });
};

const moveShard = async (shard, toNode) => {
  await validateCall(shard, toNode);

  const dbs = await utils.getDbs();
  for (const dbName of dbs) {
    const metadata = await utils.getDbMetadata(dbName);
    const oldNodes = updateDbMetadata(metadata, shard, toNode);
    if (oldNodes) {
      await utils.updateDbMetadata(dbName, metadata);
    }

    // await utils.syncShards(dbName);

    const newMetadata = await utils.getDbMetadata(dbName);
    if (oldNodes) {
      await removeNodeFromMetadata(shard, newMetadata, oldNodes);
      await utils.updateDbMetadata(dbName, newMetadata);
    }
  }
  console.log('Shard moved', shard, toNode);
};

module.exports = {
  moveShard,
};
