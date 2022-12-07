#!/usr/bin/env node

const [,, shardMatrixJson ] = process.argv;

(() => {
  if (!shardMatrixJson) {
    console.error('Please pass the shard distribution matrix as the first argument to this command.');
    process.exit(1);
  }

  try {
    const log = [];
    log.push('Move the following shard folders to the corresponding nodes data folders:');
    log.push('If your shard folder is already in the correct location, on your main node, no move is necessary.');
    for (const [shard, toNode] of Object.entries(JSON.parse(shardMatrixJson))) {
      log.push(`Move <mainNode-Path>/shards/${shard} to <${toNode}-path>/shards/${shard}`);
      log.push(`Move <mainNode-Path>/.shards/${shard} to <${toNode}-path>/.shards/${shard}`);
    }

    log.forEach(entry => console.info(entry));
  } catch (err) {
    console.error('Invalid shard matrix', err);
    process.exit(1);
  }
})();
