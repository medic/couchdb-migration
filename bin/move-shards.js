const [,, shardMatrix ] = process.argv;

const { moveShard } = require('../src/move-shard');

(async () => {
  try {
    for (const [shard, toNode] of Object.entries(JSON.parse(shardMatrix))) {
      await moveShard(shard, toNode);
    }
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
