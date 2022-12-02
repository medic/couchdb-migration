#!/bin/bash
set -e
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $BASEDIR

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
export COUCH_PORT=25984
export COUCH_CLUSTER_PORT=25986
export COUCH_URL=http://$user:$password@127.0.0.1:$COUCH_PORT

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
docker rm -f -v scripts-couchdb.1-1 scripts-couchdb.2-1 scripts-couchdb.3-1 test-couchdb

# launch vanilla couch, populate with some data
docker run -d -p $COUCH_PORT:5984 -p $COUCH_CLUSTER_PORT:5986 --name test-couchdb -e COUCHDB_USER=$user -e COUCHDB_PASSWORD=$password -v $couch1dir:/opt/couchdb/data apache/couchdb:2.3.1
waitForStatus $COUCH_URL 200
node ./scripts/generate-documents $jsondataddir
sleep 5 # this is needed, CouchDb runs fsync with a 5 second delay
# export env for 4.x couch
export $(node ../../bin/get-env.js | xargs)
docker rm -f -v test-couchdb

# launch cht 4.x CouchDb cluster
docker-compose -f ./scripts/couchdb-cluster.yml up -d
waitForStatus $COUCH_URL 200
waitForCluster $COUCH_URL

# generate shard matrix
# this is an object that assigns every shard to one of the nodes
shard_matrix=$(node ../../bin/generate-shard-distribution-matrix.js)
file_matrix="{\"couchdb@couchdb.1\":\"$couch1dir\",\"couchdb@couchdb.2\":\"$couch2dir\",\"couchdb@couchdb.3\":\"$couch3dir\"}"
echo $shard_matrix
# moves shard data files to their corresponding nodes, according to the matrix
node ./scripts/distribute-shards.js $shard_matrix $file_matrix
# change database metadata to match the shard physical locations
node ../../bin/move-shards.js $shard_matrix
# test that data exists, database shard maps are correct and view indexes are preserved
node ./scripts/assert-dbs.js $jsondataddir $shard_matrix

docker-compose -f ./scripts/couchdb-cluster.yml down --remove-orphans --volumes

