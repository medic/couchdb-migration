#!/bin/bash
set -e
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $BASEDIR

user=admin
password=pass

couchdir=$(mktemp -d -t couchdb-2x-XXXXXXXXXX)

export COUCHDB_USER=$user
export COUCHDB_PASSWORD=$password
export COUCHDB_SERVER=127.0.0.1

export DB1_DATA=$couchdir
export COUCH_PORT=25984
export COUCH_CLUSTER_PORT=25986
export COUCH_URL=http://$user:$password@$COUCHDB_SERVER:$COUCH_PORT


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

rm -rf ./data/*
docker rm -f -v scripts-couchdb.1-1 test-couchdb test-couchdb3



docker run -d -p 25984:5984 -p 25986:5986 --name test-couchdb -e COUCHDB_USER=$user -e COUCHDB_PASSWORD=$password -v $couchdir:/opt/couchdb/data apache/couchdb:2.3.1
waitForStatus $COUCH_URL 200
node ./scripts/generate-documents
sleep 5 # this is needed, CouchDb runs fsync with a 5 second delay
docker rm -f -v test-couchdb

docker-compose -f ./scripts/couchdb-single.yml up -d
waitForStatus $COUCH_URL 200

node ../../bin/move-node.js nonode@nohost couchdb@127.0.0.1

node ./scripts/assert-dbs.js

docker-compose -f ./scripts/couchdb-single.yml down --remove-orphans --volumes

