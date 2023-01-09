#!/usr/bin/env node

const [,, shardMatrix ] = process.argv;

const { moveShard } = require('../src/move-shard');

(async () => {
  try {
    for (const [shard, toNode] of Object.entries(JSON.parse(shardMatrix))) {
      await moveShard(shard, toNode);
    }
    console.log('Shards moved successfully');
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
