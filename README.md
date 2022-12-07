## CHT Data Migration tool

Facilitates migrating data from a CHT 3.x installation to a CHT 4.x installation.
Also, facilitates moving data within a CHT 4.x CouchDb cluster.

#### Installation

Check out this repository. Run:
```shell
docker-compose up
```

#### API: 

##### get-env

Requires `COUCH_URL` environment variable to be set.
Run this while running 3.x CouchDb. Outputs list of environment variables that are required by 4.x CouchDb. 

Usage:
```shell
export COUCH_URL=http://admin:pass@127.0.0.1:5984
docker-compose run couch-migration get-env
```

You can save the output in an env file:
```shell
docker-compose run couch-migration get-env > .env
```

or export every line for usage in the current terminal:
```shell
export $(docker-compose run couch-migration get-env | xargs)
```

#### move-node

Used when running 4.x CouchDb in single node.

Requires `COUCH_URL` environment variable to be set. 
If your CouchDb Cluster port is different from the default (5984), export this port as `COUCH_CLUSTER_PORT`.
Run this after starting 4.x CouchDb. Updates every databases' metadata to assign shards to the correct node. 

Usage
```shell
export COUCH_URL=http://admin:pass@127.0.0.1:5984
export COUCH_CLUSTER_PORT=5986
docker-compose run couch-migration move-node
```

#### generate-shard-distribution-matrix

Used when running 4.x CouchDb in clustered mode, with multiple nodes.

Requires `COUCH_URL` environment variable to be set.
If your CouchDb Cluster port is different from the default (5984), export this port as `COUCH_CLUSTER_PORT`.
Outputs a JSON object representing redistribution of existent shards among CouchDb nodes.
The matrix should be followed when moving shard data files among nodes, and should be passed to the `mode-shards` command.
Run this after starting 4.x CouchDb.

Usage:
```shell
shard_matrix=$(docker-compose run couch-migration generate-shard-distribution-matrix)
echo $shard_matrix
```

Example Output:
```shell
{
  "00000000-15555554": "couchdb@couchdb-1.local",
  "15555555-2aaaaaa9": "couchdb@couchdb-2.local",
  "2aaaaaaa-3ffffffe": "couchdb@couchdb-3.local",
  "3fffffff-55555553": "couchdb@couchdb-1.local",
  "55555554-6aaaaaa8": "couchdb@couchdb-2.local",
  "6aaaaaa9-7ffffffd": "couchdb@couchdb-3.local",
  "7ffffffe-95555552": "couchdb@couchdb-1.local",
  "95555553-aaaaaaa7": "couchdb@couchdb-2.local",
  "aaaaaaa8-bffffffc": "couchdb@couchdb-3.local",
  "bffffffd-d5555551": "couchdb@couchdb-1.local",
  "d5555552-eaaaaaa6": "couchdb@couchdb-2.local",
  "eaaaaaa7-ffffffff": "couchdb@couchdb-3.local"
}
```
### shard-move-instructions

Used when running 4.x CouchDb in clustered mode, with multiple nodes.
Requires output from `generate-shard-distribution-matrix` to be passed as a parameter.
Will output instructions on which shard folders to move, and to what locations. 

Usage: 
```shell
shard_matrix=$(docker-compose run couch-migration generate-shard-distribution-matrix)
docker-compose run couch-migration shard-move-instructions $shard_matrix
```

Example Output:
```shell
Move the following shard folders to the corresponding nodes data folders:
If your shard folder is already in the correct location, on your main node, no move is necessary.
Move <mainNode-Path>/shards/00000000-1fffffff to <couchdb@couchdb-1.local-path>/shards/00000000-1fffffff
Move <mainNode-Path>/.shards/00000000-1fffffff to <couchdb@couchdb-1.local-path>/.shards/00000000-1fffffff
Move <mainNode-Path>/shards/20000000-3fffffff to <couchdb@couchdb-2.local-path>/shards/20000000-3fffffff
Move <mainNode-Path>/.shards/20000000-3fffffff to <couchdb@couchdb-2.local-path>/.shards/20000000-3fffffff
Move <mainNode-Path>/shards/40000000-5fffffff to <couchdb@couchdb-3.local-path>/shards/40000000-5fffffff
Move <mainNode-Path>/.shards/40000000-5fffffff to <couchdb@couchdb-3.local-path>/.shards/40000000-5fffffff
Move <mainNode-Path>/shards/60000000-7fffffff to <couchdb@couchdb-1.local-path>/shards/60000000-7fffffff
Move <mainNode-Path>/.shards/60000000-7fffffff to <couchdb@couchdb-1.local-path>/.shards/60000000-7fffffff
Move <mainNode-Path>/shards/80000000-9fffffff to <couchdb@couchdb-2.local-path>/shards/80000000-9fffffff
Move <mainNode-Path>/.shards/80000000-9fffffff to <couchdb@couchdb-2.local-path>/.shards/80000000-9fffffff
Move <mainNode-Path>/shards/a0000000-bfffffff to <couchdb@couchdb-3.local-path>/shards/a0000000-bfffffff
Move <mainNode-Path>/.shards/a0000000-bfffffff to <couchdb@couchdb-3.local-path>/.shards/a0000000-bfffffff
Move <mainNode-Path>/shards/c0000000-dfffffff to <couchdb@couchdb-1.local-path>/shards/c0000000-dfffffff
Move <mainNode-Path>/.shards/c0000000-dfffffff to <couchdb@couchdb-1.local-path>/.shards/c0000000-dfffffff
Move <mainNode-Path>/shards/e0000000-ffffffff to <couchdb@couchdb-2.local-path>/shards/e0000000-ffffffff
Move <mainNode-Path>/.shards/e0000000-ffffffff to <couchdb@couchdb-2.local-path>/.shards/e0000000-ffffffff
```


### move-shards

Used when running 4.x CouchDb in clustered mode, with multiple nodes.

Requires `COUCH_URL` environment variable to be set.
If your CouchDb Cluster port is different from the default (5984), export this port as `COUCH_CLUSTER_PORT`.
Requires output from `generate-shard-distribution-matrix` to be passed as a parameter.
Updates every databases' metadata to assign shards to the correct node, according to the distribution matrix. 

Usage
```shell
shard_matrix=$(generate-shard-distribution-matrix)
docker-compose run couch-migration move-shards $shard_matrix
```

### Single Node example

#### Note
When starting 4.x CouchDb, you should mount the same data volume that 3.x CouchDb was using.

```shell
<start 3.x CouchDb>
docker-compose run couch-migration get-env > /path/to/docker-compose/.env
<stop 3.x CouchDb>
docker-compose -f ./path/to/docker-compose/couchdb-single.yml up -d
<wait for CouchDb to be up>
docker-compose run couch-migration move-node
```

### Clustered example

#### Note
When clustering, your 4.x CouchDb cluster will have one main node and multiple secondary nodes. 
The main node is defined in your docker-compose file, and is the one that receives the environment variable: `CLUSTER_PEER_IPS`, while your secondary nodes will receive a different environment variable: `COUCHDB_SYNC_ADMINS_NODE`.
When starting 4.x CouchDb, you should mount the 3.x CouchDb data volume to the main CouchDb node, and create two more folders/volumes for the secondary nodes.
The couch-migration script does not know which of the nodes is the main node. 

```shell
<start 3.x CouchDb>
docker-compose run couch-migration get-env > /path/to/docker-compose/.env
<stop 3.x Couchdb>
docker-compose -f ./path/to/docker-compose/couchdb-cluster.yml up -d
<wait for CouchDb to be up>
shard_matrix=$(docker-compose run couch-migration generate-shard-distribution-matrix)
docker-compose run couch-migration shard-move-instructions $shard_matrix
<move shard and .shard folders to seconday nodes according to the instructions from the step above>
docker-compose run couch-migration move-shards $shard_matrix
```
