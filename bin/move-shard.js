#!/usr/bin/env node

const [,, shard, toNode ] = process.argv;

const { moveShard } = require('../src/move-shard');

(async () => {
  try {
    await moveShard(shard, toNode);
    console.log('Shard moved successfully');
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
