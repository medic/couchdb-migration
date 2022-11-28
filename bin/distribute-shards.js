const [,, source, ...destinations ] = process.argv;

const { distributeShards, moveMainFiles } = require('../src/distribute-shards');

(async () => {
  try {
    // await moveMainFiles(source, destinations);
    await distributeShards(source, destinations);
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
