#!/bin/bash
set -eu
BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$BASEDIR"

user=admin
password=pass

couchdir=$(mktemp -d -t couchdb-2x-XXXXXXXXXX)
jsondataddir=$(mktemp -d -t json-XXXXXXXXXX)

export CHT_NETWORK=couch-migration-network
export DB1_DATA=$couchdir
export COUCHDB_USER=$user
export COUCHDB_PASSWORD=$password
export COUCH_PORT=25984
export COUCH_CLUSTER_PORT=25986
export HOST_COUCH_URL=http://$user:$password@127.0.0.1:$COUCH_PORT
export COUCH_URL=http://$user:$password@couchdb-1.local:$COUCH_PORT

# cleanup from last test, in case of interruptions
docker rm -f -v scripts-couchdb-1.local-1

# create docker network
docker network create $CHT_NETWORK || true
# build service image
docker compose -f ../docker-compose-test.yml up --build

# launch vanilla couch, populate with some data
docker compose -f ./scripts/couchdb-vanilla.yml up -d
docker compose -f ../docker-compose-test.yml run couch-migration check-couchdb-up
node ./scripts/generate-documents $jsondataddir
# pre-index 4.0.1 views
docker compose -f ../docker-compose-test.yml run couch-migration pre-index-views 4.4.0
sleep 5 # this is needed, CouchDb runs fsync with a 5 second delay
# export env for cht 4.x couch
export $(docker compose -f ../docker-compose-test.yml run couch-migration get-env | xargs)
docker compose -f ./scripts/couchdb-vanilla.yml down --remove-orphans --volumes

# launch cht 4.x CouchDb single node
docker compose -f ./scripts/couchdb3-single.yml up -d
docker compose -f ../docker-compose-test.yml run couch-migration check-couchdb-up
# change database metadata to match new node name
docker compose -f ../docker-compose-test.yml run couch-migration move-node
docker compose -f ../docker-compose-test.yml run couch-migration verify
# test that data exists, database shard maps are correct and view indexes are preserved
node ./scripts/assert-dbs.js $jsondataddir

docker compose -f ./scripts/couchdb-single.yml down --remove-orphans --volumes

