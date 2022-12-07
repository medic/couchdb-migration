const path = require('path');
const fs = require('fs').promises;
const [,, shardMatrixJson, fileMatrixJson ] = process.argv;

const SHARDS = 'shards';
const DOT_SHARDS = '.shards';

const sameShards = (shards, dotShards) => {
  if (shards.length !== dotShards.length || !shards.length) {
    return false;
  }
  return shards.every((shard, i) => dotShards[i] === shard);
};

const distributeShards = async (shardMatrix, fileMatrix) => {
  const mainPath = fileMatrix['couchdb@couchdb-1.local'];

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

(async () => {
  try {
    await distributeShards(JSON.parse(shardMatrixJson), JSON.parse(fileMatrixJson));
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
