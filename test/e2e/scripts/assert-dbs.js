const rpn = require('request-promise-native');
const path = require('path');
const url = process.env.COUCH_URL;

const [,,dataPath, shardMatrixJson] = process.argv;
const shardMatrix = shardMatrixJson && JSON.parse(shardMatrixJson);

const getDbs = () => rpn.get({ url: `${url}/_all_dbs`, json: true });
const syncShards = (db) => rpn.post({ url: `${url}/${db}/_sync_shards`, json: true });

const checkDocs = async (db) => {
  const docs = require(path.join(dataPath, `${db}.json`));
  const allDocs = await rpn.get({ url: `${url}/${db}/_all_docs?include_docs=true`, json: true });
  const newDocs = allDocs.rows.map(row => row.doc);

  const errors = [];

  docs.forEach(doc => {
    const newDoc = newDocs.find(newDoc => newDoc._id === doc._id);
    if (!newDoc || newDoc.value !== doc.value) {
      errors.push([doc, newDoc]);
    }
  });

  if (errors.length) {
    console.error(errors);
    throw new Error('Found invalid docs');
  }

  return docs.length;
};

const checkViewIndexes = async (db, nbrDocs) => {
  const t = Date.now();
  const staleViewUrl = `${url}/${db}/_design/test/_view/view?stale=ok&update_seq=true&limit=0`;
  console.log(staleViewUrl);
  console.log('view request took', Date.now() - t);
  const view = await rpn.get({ url: staleViewUrl, json: true });
  view.db = db;
  console.log(JSON.stringify(view, null, 2));
  return view.total_rows === nbrDocs;
};

const checkSharding = async (db) => {
  if (!shardMatrix) {
    return true;
  }

  const response = await rpn.get({ url: `${url}/${db}/_shards`, json: true });
  const dbShards = response.shards;

  for (const [shard, nodes] of Object.entries(dbShards)) {
    if (shardMatrix[shard] !== nodes[0] || nodes.length > 1) {
      return false;
    }
  }
  return true;
};

(async () => {
  const viewErrors = [];
  const shardErrors = [];

  const dbs = await getDbs();

  for (const db of dbs) {
    if (db === '_users') {
      continue;
    }

    await syncShards(db);
    const nbrDocs = await checkDocs(db);
    if (!await checkViewIndexes(db, nbrDocs)) {
      viewErrors.push(db);
    }
    if (!await checkSharding(db)) {
      shardErrors.push(db);
    }
  }

  if (viewErrors.length) {
    console.error(JSON.stringify(viewErrors, null, 2));
    throw new Error('Some views are not indexed');
  }
  if (shardErrors.length) {
    console.error(JSON.stringify(shardErrors, null, 2));
    throw new Error('Some databases are not correctly sharded');
  }
})();
