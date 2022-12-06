#!/usr/bin/env node

const { getEnv } = require('../src/get-env');

(async () => {
  try {
    await getEnv();
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
