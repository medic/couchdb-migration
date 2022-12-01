const fs = require('fs').promises;
const path = require('path');
const utils = require('./utils');

const SHARDS = 'shards';
const DOT_SHARDS = '.shards';

const sameShards = (shards, dotShards) => {
  if (shards.length !== dotShards.length || !shards.length) {
    return false;
  }
  return shards.every((shard, i) => dotShards[i] === shard);
};

const distributeShards = async (shardMatrix, fileMatrix) => {
  const mainPath = fileMatrix['couchdb@couchdb.1'];

  const shards = await fs.readdir(path.join(mainPath, SHARDS));
  const dotShards = await fs.readdir(path.join(mainPath, DOT_SHARDS));

  if (!sameShards(shards, dotShards)) {
    throw new Error('bad data'); // todo
  }

  for (const [shard, node] of Object.entries(shardMatrix)) {
    const destination = fileMatrix[node];
    await fs.rename(path.join(mainPath, SHARDS, shard), path.join(destination, SHARDS, shard));
    await fs.rename(path.join(mainPath, DOT_SHARDS, shard), path.join(destination, DOT_SHARDS, shard));
  }
};

const generateMatrix = async () => {
  const shards = await utils.getShards();
  const nodes = await utils.getNodes();
  return Object.assign(...shards.map((shard, idx) => ({ [shard]: nodes[idx % nodes.length] })));
};

/*
const moveMainFiles = async (source, destinations) => {
  const files = await fs.readdir(path.join(source));
  for (const file of files) {
    if (file === SHARDS || file === DOT_SHARDS) {
      return;
    }
    await fs.rename(path.join(source, file), path.join(destinations[0], file));
  }
};*/

module.exports = {
  distributeShards,
  generateMatrix,
  // moveMainFiles,
};
