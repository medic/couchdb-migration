const utils = require('./utils');
const moveShard = require('./move-shard');

const replaceForSingleNode = async (toNode) => {
  const removedNodes = [];

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
  return [...new Set(removedNodes)];
};

const replaceInCluster = async (nodeMap, shardMapJson) => {
  const removedNodes = [];
  if (!shardMapJson) {
    throw new Error('Shard map JSON is required for multi-node migration');
  }

  const [oldNode, newNode] = Object.entries(nodeMap)[0];
  console.log(`Migrating from ${oldNode} to ${newNode}`);

  // Use the provided shard map
  const currentDistribution = shardMapJson;

  // For each shard range in the current distribution
  console.log('Current distribution:', currentDistribution);
  for (const [shardRange, dbNodes] of Object.entries(currentDistribution)) {
    console.log('Shard range:', shardRange);
    console.log('DB nodes:', dbNodes);
    // dbNodes is an object mapping db names to node names
    for (const [dbName, nodeName] of Object.entries(dbNodes)) {
      console.log('DB name:', dbName);
      console.log('Node name:', nodeName);
      if (nodeName === oldNode) {
        console.log(
          `Moving shard ${shardRange} for db ${dbName} from ${oldNode} to ${newNode}`
        );
        const oldNodes = await moveShard.moveShard(shardRange, newNode, dbName);
        removedNodes.push(...oldNodes);
      }
    }
  }
  if (!removedNodes.includes(oldNode)) {
    removedNodes.push(oldNode);
  }
  return [...new Set(removedNodes)];
};

const moveNode = async (nodeMap, shardMapJson) => {
  if (typeof nodeMap === 'object') {
    // Multi-node migration - replace node in clustered couch
    return await replaceInCluster(nodeMap, shardMapJson);
  }

  // Single node migration - replace node in standalone couch
  return await replaceForSingleNode(nodeMap);
};

const syncShards = async () => {
  try {
    const membership = await utils.getMembership();
    const { all_nodes, cluster_nodes } = membership;

    const clusterComplete =
      all_nodes.length === cluster_nodes.length &&
      all_nodes.every((node) => cluster_nodes.includes(node));

    if (clusterComplete) {
      const allDbs = await utils.getDbs();
      for (const db of allDbs) {
        await utils.syncShards(db);
      }
      console.log('Shards synchronized.');
    } else {
      console.log(
        'Multi-node migration detected. Shard synchronization will be run once all nodes have been migrated.'
      );
    }
  } catch (err) {
    console.error('Error during shard synchronization:', err);
    throw err;
  }
};

module.exports = {
  moveNode,
  syncShards
};
