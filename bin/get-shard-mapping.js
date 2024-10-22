#!/usr/bin/env node

const { getShardMapping } = require('../src/utils');

(async () => {
  try {
    const shardMapping = await getShardMapping();
    console.log(JSON.stringify(shardMapping));
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
