## CHT Data Migration tool

Facilitates migrating data from a CHT 3.x installation to a CHT 4.x installation.
Also, facilitates moving data within a CHT 4.x CouchDb cluster.

#### Installation
```shell
npm ci
npm link
```

#### API: 

##### get-env

Requires `COUCH_URL` environment variable to be set.
Run this while running 3.x CouchDb. Outputs list of environment variables that are required by 4.x CouchDb. 

Usage:
```shell
export COUCH_URL=http://admin:pass@127.0.0.1:5984
get-env
```

You can save the output in an env file:
```shell
get-env > .env
```

or export every line for usage in the current terminal:
```shell
export $(get-env | xargs)
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
move-node
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
shard_matrix=$(generate-shard-distribution-matrix)
echo $shard_matrix
```

Example Output:
```shell
{
  "00000000-15555554": "couchdb@couchdb.1",
  "15555555-2aaaaaa9": "couchdb@couchdb.2",
  "2aaaaaaa-3ffffffe": "couchdb@couchdb.3",
  "3fffffff-55555553": "couchdb@couchdb.1",
  "55555554-6aaaaaa8": "couchdb@couchdb.2",
  "6aaaaaa9-7ffffffd": "couchdb@couchdb.3",
  "7ffffffe-95555552": "couchdb@couchdb.1",
  "95555553-aaaaaaa7": "couchdb@couchdb.2",
  "aaaaaaa8-bffffffc": "couchdb@couchdb.3",
  "bffffffd-d5555551": "couchdb@couchdb.1",
  "d5555552-eaaaaaa6": "couchdb@couchdb.2",
  "eaaaaaa7-ffffffff": "couchdb@couchdb.3"
}
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
move-shards $shard_matrix
```

### Single Node example

TODO:
Still requires instructions for exporting CouchDb data paths

```shell
get-env > /path/to/docker-compose/.env
<stop 3.x Couchdb>
docker-compose -f ./path/to/docker-compose/couchdb-single.yml up -d
<wait for CouchDb to be up>
move-node
```

### Clustered example

TODO:
Still requires instructions for exporting CouchDb data paths and creating data folder for each node

```shell
get-env > /path/to/docker-compose/.env
<stop 3.x Couchdb>
docker-compose -f ./path/to/docker-compose/couchdb-cluster.yml up -d
<wait for CouchDb to be up>
shard_matrix=$(generate-shard-distribution-matrix)
<move shard and .shard folders to distributed nodes according to the matrix>
move-shards $shard_matrix
```
