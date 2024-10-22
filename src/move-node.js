const utils = require('./utils');
const moveShard = require('./move-shard');

const replaceNodeInStandAloneCouch = async (toNode) => {
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
  return removedNodes;
};

const replaceNodeInClusteredCouch = async (toNode, shardMapJson) => {
  const removedNodes = [];
  if (!shardMapJson) {
    throw new Error('Shard map JSON is required for multi-node migration');
  }
  const shardMap = JSON.parse(shardMapJson);
  const [oldNode, newNode] = Object.entries(toNode)[0];
  console.log(`Migrating from ${oldNode} to ${newNode}`);

  for (const [shardRange, currentNode] of Object.entries(shardMap)) {
    if (currentNode === oldNode) {
      console.log(`Moving shard ${shardRange} from ${oldNode} to ${newNode}`);
      const oldNodes = await moveShard.moveShard(shardRange, newNode);
      removedNodes.push(...oldNodes);
    }
  }
  if (!removedNodes.includes(oldNode)) {
    removedNodes.push(oldNode);
  }
return [...new Set(removedNodes)];
};

const moveNode = async (nodeMap, shardMapJson) => {
  if (typeof nodeMap === 'object') {
    return await replaceInCluster(nodeMap, shardMapJson);
  }
  
  return  await replaceForSingleNode(nodeMap);
};
  let removedNodes = [];
  if (typeof toNode === 'object') {
    // Multi-node migration - replace node in clustered couch
    removedNodes = await replaceNodeInClusteredCouch(toNode, shardMapJson);
  } else {
    // Single node migration - replace node in standalone couch
    removedNodes = await replaceNodeInStandAloneCouch(toNode);
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
