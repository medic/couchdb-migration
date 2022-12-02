#!/bin/bash
set -e
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $BASEDIR

user=admin
password=pass

couchdir=$(mktemp -d -t couchdb-2x-XXXXXXXXXX)
jsondataddir=$(mktemp -d -t json-XXXXXXXXXX)

export DB1_DATA=$couchdir
export COUCH_PORT=25984
export COUCH_CLUSTER_PORT=25986
export COUCH_URL=http://$user:$password@127.0.0.1:$COUCH_PORT

waitForStatus() {
  count=0
  echo 'Starting curl check'
  echo $1
  while [ `curl -o /dev/null -s -w "%{http_code}\n" "$1"` -ne "$2" -a $count -lt 300 ]
    do count=$((count+=1))
    echo "Waiting for CouchDb to respond. Current count is $count"
    sleep 1
  done
  echo "CouchDb ready"
}

# cleanup from last test, in case of interruptions
docker rm -f -v scripts-couchdb.1-1 test-couchdb

# launch vanilla couch, populate with some data
docker run -d -p 25984:5984 -p 25986:5986 --name test-couchdb -e COUCHDB_USER=$user -e COUCHDB_PASSWORD=$password -v $couchdir:/opt/couchdb/data apache/couchdb:2.3.1
waitForStatus $COUCH_URL 200
node ./scripts/generate-documents $jsondataddir
sleep 5 # this is needed, CouchDb runs fsync with a 5 second delay
# export env for 4.x couch
export $(get-env | xargs)
docker rm -f -v test-couchdb

# launch cht 4.x CouchDb single node
docker-compose -f ./scripts/couchdb-single.yml up -d
waitForStatus $COUCH_URL 200
# change database metadata to match new node name
move-node
# test that data exists, database shard maps are correct and view indexes are preserved
node ./scripts/assert-dbs.js $jsondataddir

docker-compose -f ./scripts/couchdb-single.yml down --remove-orphans --volumes

