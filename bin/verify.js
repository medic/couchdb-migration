#!/usr/bin/env node

const { verify } = require('../src/verify');

(async () => {
  try {
    await verify();
    console.log('Migration verification passed.');
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
