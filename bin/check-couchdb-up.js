#!/usr/bin/env node

const [,, numNodes ] = process.argv;

const { checkCouchUp, checkClusterReady } = require('../src/check-couch-up');

(async () => {
  try {
    console.log('Waiting for CouchDb to be ready...');
    await checkCouchUp();

    if (!numNodes || isNaN(parseInt(numNodes))) {
      console.log('CouchDb is Ready');
      return;
    }

    console.log('Waiting for CouchDb Cluster to be ready....');
    await checkClusterReady(parseInt(numNodes));
    console.log('CouchDb Cluster is Ready');
  } catch (err) {
    console.error('An unexpected error occurred', err);
    process.exit(1);
  }
})();
