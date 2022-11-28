#!/bin/bash
set -e
user=admin
password=pass

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

tmp_dir=$(mktemp -d -t couchdb-2x-XXXXXXXXXX)
docker run -d -p 15984:5984 -p 15986:5986 --name test-couchdb -e COUCHDB_USER=$user -e COUCHDB_PASSWORD=$password -v $tmp_dir:/opt/couchdb/data apache/couchdb:2.3.1
waitForStatus http://$user:$password@127.0.0.1:15984 200
node ./scripts/generate-documents
docker rm -f -v test-couchdb

echo $COUCHDB_PASSWORD

COUCHDB_USER=$user COUCHDB_PASSWORD=$password DB1_DATA=$tmp_dir docker-compose -f ./scripts/couchdb-single.yml up -d
waitForStatus http://$user:$password@127.0.0.1:25984 200
COUCHDB_USER=$user COUCHDB_PASSWORD=$password COUCHDB_SERVER=127.0.0.1 node ../../bin/move-node.js nonode@nohost couchdb@127.0.0.1
node ./scripts/assert-dbs.js

COUCHDB_USER=$user COUCHDB_PASSWORD=$password DB1_DATA=$tmp_dir docker-compose -f ./scripts/couchdb-single.yml down --remove-orphans

