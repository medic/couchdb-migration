#!/usr/bin/env node

const { verify } = require('../src/verify');

(async () => {
  try {
    await verify();
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
