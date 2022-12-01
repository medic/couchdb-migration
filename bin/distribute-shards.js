const [,, shardMatrixJson, fileMatrixJson ] = process.argv;

const { distributeShards } = require('../src/distribute-shards');

(async () => {
  try {
    await distributeShards(JSON.parse(shardMatrixJson), JSON.parse(fileMatrixJson));
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
