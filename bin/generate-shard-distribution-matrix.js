#!/usr/bin/env node

const { generateMatrix } = require('../src/distribute-shards');

(async () => {
  try {
    console.log(JSON.stringify(await generateMatrix()));
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
