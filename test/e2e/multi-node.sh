#!/bin/bash
set -e
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $BASEDIR
npm link

user=admin
password=pass

couch1dir=$(mktemp -d -t couchdb-2x-XXXXXXXXXX)
couch2dir=$(mktemp -d -t couchdb-2x-XXXXXXXXXX)
couch3dir=$(mktemp -d -t couchdb-2x-XXXXXXXXXX)
mkdir -p $couch2dir/shards $couch2dir/.shards $couch3dir/shards $couch3dir/.shards
jsondataddir=$(mktemp -d -t json-XXXXXXXXXX)

export DB1_DATA=$couch1dir
export DB2_DATA=$couch2dir
export DB3_DATA=$couch3dir
export CHT_NETWORK=couch-migration-network-cluster
export COUCHDB_USER=$user
export COUCHDB_PASSWORD=$password
export COUCH_PORT=25984
export COUCH_CLUSTER_PORT=25986
export HOST_COUCH_URL=http://$user:$password@127.0.0.1:$COUCH_PORT
export COUCH_URL=http://$user:$password@couchdb.one:$COUCH_PORT

waitForStatus() {
  count=0
  echo 'Starting curl check'
  while [ `curl -o /dev/null -s -w "%{http_code}\n" "$1"` -ne "$2" -a $count -lt 300 ]
  do
    count=$((count+=1))
    echo "Waiting for CouchDb to respond. Current count is $count"
    sleep 1
  done
  echo "CouchDb ready"
}

verify_membership() {
  curl -s $1/_membership | jq "(.all_nodes | length) == 3"
}

waitForCluster() {
   count=0
   while [ `verify_membership $1` != "true" -a $count -lt 300 ]
   do
      count=$((count+=1))
      echo "Waiting for cluster to be ready. Current count is $count"
      sleep 1
  done
  echo "CouchDb cluster ready"
}

# cleanup from last test, in case of interruptions
docker rm -f -v scripts-couchdb.one-1 scripts-couchdb.two-1 scripts-couchdb.three-1

# create docker network
docker network create $CHT_NETWORK || true
# build service image
docker-compose -f ../../docker-compose.yml up --build

# launch vanilla couch, populate with some data
docker-compose -f ./scripts/couchdb-vanilla.yml up -d
waitForStatus $HOST_COUCH_URL 200
node ./scripts/generate-documents $jsondataddir
sleep 5 # this is needed, CouchDb runs fsync with a 5 second delay
# export env for 4.x couch
export $(docker-compose -f ../../docker-compose.yml run couch-migration get-env | xargs)
docker-compose -f ./scripts/couchdb-vanilla.yml down --remove-orphans --volumes

# launch cht 4.x CouchDb cluster
docker-compose -f ./scripts/couchdb-cluster.yml up -d
waitForStatus $HOST_COUCH_URL 200
waitForCluster $HOST_COUCH_URL

# generate shard matrix
# this is an object that assigns every shard to one of the nodes
shard_matrix=$(docker-compose -f ../../docker-compose.yml run couch-migration generate-shard-distribution-matrix)
file_matrix="{\"couchdb@couchdb.one\":\"$couch1dir\",\"couchdb@couchdb.two\":\"$couch2dir\",\"couchdb@couchdb.three\":\"$couch3dir\"}"
echo $shard_matrix
# moves shard data files to their corresponding nodes, according to the matrix
node ./scripts/distribute-shards.js $shard_matrix $file_matrix
# change database metadata to match the shard physical locations
docker-compose -f ../../docker-compose.yml run couch-migration move-shards $shard_matrix
# test that data exists, database shard maps are correct and view indexes are preserved
node ./scripts/assert-dbs.js $jsondataddir $shard_matrix

docker-compose -f ./scripts/couchdb-cluster.yml down --remove-orphans --volumes

