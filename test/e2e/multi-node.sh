#!/bin/bash
set -eu
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$BASEDIR"

user=admin
password=pass

couch1dir=$(mktemp -d -t couchdb-2x.XXXXXXXXXX)
couch2dir=$(mktemp -d -t couchdb-2x.XXXXXXXXXX)
couch3dir=$(mktemp -d -t couchdb-2x.XXXXXXXXXX)

mkdir -p $couch1dir/shards $couch1dir/.shards $couch2dir/shards $couch2dir/.shards $couch3dir/shards $couch3dir/.shards
jsondataddir=$(mktemp -d -t json.XXXXXXXXXX)

export DB1_DATA=$couch1dir
export DB2_DATA=$couch2dir
export DB3_DATA=$couch3dir
export CHT_NETWORK=couch-migration-network-cluster
export COUCHDB_USER=$user
export COUCHDB_PASSWORD=$password
export COUCH_PORT=25984
export COUCH_CLUSTER_PORT=25986
export HOST_COUCH_URL=http://$user:$password@127.0.0.1:$COUCH_PORT
export COUCH_URL=http://$user:$password@couchdb-1.local:$COUCH_PORT

# cleanup from last test, in case of interruptions
docker rm -f -v scripts-couchdb-1.local-1 scripts-couchdb-2.local-1 scripts-couchdb-3.local-1
docker rm -f -v scripts-couchdb-1-namespace-svc-cluster.local-1 scripts-couchdb-2-namespace-svc-cluster.local-1 scripts-couchdb-3-namespace-svc-cluster.local-1

# create docker network
docker network create $CHT_NETWORK || true
# build service image
docker compose -f ../docker-compose-test.yml up --build

# launch vanilla couch, populate with some data
docker compose -f ./scripts/couchdb-vanilla.yml up -d
docker compose -f ../docker-compose-test.yml run couch-migration check-couchdb-up
node ./scripts/generate-documents $jsondataddir
# pre-index 4.0.1 views
docker compose -f ../docker-compose-test.yml run couch-migration pre-index-views 4.0.1
sleep 5 # this is needed, CouchDb runs fsync with a 5 second delay

# export env for cht 4.x couch
export $(docker compose -f ../docker-compose-test.yml run couch-migration get-env | xargs)
docker compose -f ./scripts/couchdb-vanilla.yml down --remove-orphans --volumes

# launch cht 4.x CouchDb cluster
docker compose -f ./scripts/couchdb-cluster.yml up -d
docker compose -f ../docker-compose-test.yml run couch-migration check-couchdb-up 3

# generate shard matrix
# this is an object that assigns every shard to one of the nodes
shard_matrix=$(docker compose -f ../docker-compose-test.yml run couch-migration generate-shard-distribution-matrix)
file_matrix="{\"couchdb@couchdb-1.local\":\"$couch1dir\",\"couchdb@couchdb-2.local\":\"$couch2dir\",\"couchdb@couchdb-3.local\":\"$couch3dir\"}"
echo $shard_matrix
echo $file_matrix
# moves shard data files to their corresponding nodes, according to the matrix
docker compose -f ../docker-compose-test.yml run couch-migration shard-move-instructions $shard_matrix
node ./scripts/distribute-shards.js "$shard_matrix" "$file_matrix"

# change database metadata to match the shard physical locations
docker compose -f ../docker-compose-test.yml run couch-migration move-shards $shard_matrix
# Remove old node from cluster
docker compose -f ../docker-compose-test.yml run couch-migration remove-node couchdb@127.0.0.1

docker compose -f ../docker-compose-test.yml run couch-migration verify
# test that data exists, database shard maps are correct and view indexes are preserved
node ./scripts/assert-dbs.js $jsondataddir $shard_matrix

# Let's get the shard mapping - we need this to migrate to a different cluster.
shard_mapping=$(docker compose -f ../docker-compose-test.yml run couch-migration get-shard-mapping)
echo $shard_mapping

docker compose -f ./scripts/couchdb-cluster.yml down --remove-orphans --volumes

# launch a different cht 4.x CouchDb cluster
docker compose -f ./scripts/couchdb-cluster-2.yml up -d

# set new COUCH_URL for cluster-2
export COUCH_URL=http://$user:$password@couchdb-1-namespace-svc-cluster.local:$COUCH_PORT

docker compose -f ../docker-compose-test.yml run couch-migration check-couchdb-up 3

# change database metadata to match new node name
# Move nodes one by one using move-node.js oldNode:newNode

docker compose -f ../docker-compose-test.yml run couch-migration sh -c "echo '$shard_mapping' | move-node '{\"couchdb@couchdb-1.local\":\"couchdb@couchdb-1-namespace-svc-cluster.local\"}'"

docker compose -f ../docker-compose-test.yml run couch-migration sh -c "echo '$shard_mapping' | move-node '{\"couchdb@couchdb-2.local\":\"couchdb@couchdb-2-namespace-svc-cluster.local\"}'"

docker compose -f ../docker-compose-test.yml run couch-migration sh -c "echo '$shard_mapping' | move-node '{\"couchdb@couchdb-3.local\":\"couchdb@couchdb-3-namespace-svc-cluster.local\"}'"

docker compose -f ../docker-compose-test.yml run couch-migration verify

# test that data exists, database shard maps are correct and view indexes are preserved
shard_mapping2=$(docker compose -f ../docker-compose-test.yml run couch-migration get-shard-mapping)

node ./scripts/assert-dbs.js $jsondataddir # Don't specify shard matrix - that gets verified below

node_mapping='{"couchdb@couchdb-1.local":"couchdb@couchdb-1-namespace-svc-cluster.local",
               "couchdb@couchdb-2.local":"couchdb@couchdb-2-namespace-svc-cluster.local",
               "couchdb@couchdb-3.local":"couchdb@couchdb-3-namespace-svc-cluster.local"}'
node ./scripts/compare-shard-mappings.js "$node_mapping" "$shard_mapping" "$shard_mapping2"

docker compose -f ./scripts/couchdb-cluster-2.yml down --remove-orphans --volumes
