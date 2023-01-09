#!/usr/bin/env node

const [,, version ] = process.argv;

const { preIndexViews } = require('../src/pre-index-views');

(async () => {
  if (!version) {
    console.error('Please pass the target CHT version as the first argument to this command. Example: 4.1.0.');
    process.exit(1);
  }
  try {
    await preIndexViews(version);
    console.log('View indexing complete');
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
