#!/usr/bin/env node

const [,, shard, toNode ] = process.argv;

const { moveShard } = require('../src/move-shard');

(async () => {
  try {
    await moveShard(shard, toNode);
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
