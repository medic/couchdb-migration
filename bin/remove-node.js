#!/usr/bin/env node

const [ ,, nodeName ] = process.argv;
const { removeNode } = require('../src/remove-node');

(async () => {
  try {
    await removeNode(nodeName);
    console.log(`Node ${nodeName} was removed successfully`);
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
