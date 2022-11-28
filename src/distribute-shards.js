const fs = require('fs').promises;
const path = require('path');

const SHARDS = 'shards';
const DOT_SHARDS = '.shards';

const sameShards = (shards, dotShards) => {
  if (shards.length !== dotShards.length || !shards.length) {
    return false;
  }
  return shards.every((shard, i) => dotShards[i] === shard);
};

const splitShards = (shards, destinations) => {
  const nbrDestinations = destinations.length + 1;
  const shardMap = Object.assign(...shards.map((shard, idx) => ({ [shard]: destinations[idx % nbrDestinations] })));
  return shardMap;
};

const distributeShards = async (source, destinations) => {
  if (!destinations.length || !source) {
    throw new Error('bad input'); // todo
  }

  const shards = await fs.readdir(path.join(source, SHARDS));
  const dotShards = await fs.readdir(path.join(source, DOT_SHARDS));

  if (!sameShards(shards, dotShards)) {
    throw new Error('bad data'); // todo
  }

  const shardMap = splitShards(shards, [source, ...destinations]);
  for (const shard of shards) {
    const destination = shardMap[shard];
    await fs.rename(path.join(source, SHARDS, shard), path.join(destination, SHARDS, shard));
    await fs.rename(path.join(source, DOT_SHARDS, shard), path.join(destination, DOT_SHARDS, shard));
  }
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

modules.exports = {
  distributeShards,
  moveMainFiles,
};
