#!/usr/bin/env node

const [,, nodeMappingJson, oldMappingJson, newMappingJson] = process.argv;
const DBS_TO_IGNORE = ['_global_changes', '_replicator', '_users'];

if (!nodeMappingJson || !oldMappingJson || !newMappingJson) {
  console.error('Usage: compare-shard-mappings.js <node-mapping-json> <old-mapping-json> <new-mapping-json>');
  process.exit(1);
  /* Usage:
     node_mapping='{"couchdb@couchdb-1.local":"couchdb@couchdb-1-namespace-svc-cluster.local",
                    "couchdb@couchdb-2.local":"couchdb@couchdb-2-namespace-svc-cluster.local",
                    "couchdb@couchdb-3.local":"couchdb@couchdb-3-namespace-svc-cluster.local"}'
     node ./scripts/compare-shard-mappings.js "$node_mapping" "$shard_mapping" "$shard_mapping2"
  */
}

function compareMappings(nodeMappingJson, oldMappingJson, newMappingJson) {
  const nodeMapping = JSON.parse(nodeMappingJson);
  const oldMapping = JSON.parse(oldMappingJson);
  const newMapping = JSON.parse(newMappingJson);

  Object.keys(oldMapping).forEach(shardRange => {
    if (!(shardRange in newMapping)) {
      console.error(`Shard range ${shardRange} from original mapping not found in new mapping`);
      process.exit(1);
    }

    const oldShardDbs = oldMapping[shardRange];
    const newShardDbs = newMapping[shardRange];

    Object.keys(oldShardDbs).forEach(dbName => {
      if (DBS_TO_IGNORE.includes(dbName)) {
        return;
      }

      if (!(dbName in newShardDbs)) {
        console.error(`Database ${dbName} in shard range ${shardRange} not found in new mapping`);
        process.exit(1);
      }

      const oldNode = oldShardDbs[dbName];
      const newNode = newShardDbs[dbName];

      // Map old node name to new node name using the nodeMapping
      const expectedNewNode = nodeMapping[oldNode];

      if (expectedNewNode !== newNode) {
        console.error(
          `Node assignment mismatch for database ${dbName} in shard range ${shardRange}.\n` +
          `Expected: ${expectedNewNode}\nGot: ${newNode}`
        );
        process.exit(1);
      }
    });
  });

  console.log('Shard mappings match successfully after node name conversion');
}

compareMappings(nodeMappingJson, oldMappingJson, newMappingJson);
