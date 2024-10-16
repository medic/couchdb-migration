#!/usr/bin/env node

const { get_shard_mapping } = require('../src/get-shard-mapping');

(async () => {
  try {
    const shardMapping = await get_shard_mapping();
    console.log(shardMapping);
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
