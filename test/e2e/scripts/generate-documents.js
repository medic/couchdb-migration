const rpn = require('request-promise-native');
const uuid = require('uuid').v4;
const fs = require('fs').promises;
const path = require('path');

const url = 'http://admin:pass@localhost:15984';
const dataPath = path.join(__dirname, '..', 'data');

// const nbrDatabases = 4;
const nbrDocuments = 50000;

const ddoc = {
  "_id": "_design/test",
  "views": {
    "view": {
      "map": "function(doc) {\n  emit(doc.value); }",
    }
  }
};

const generateDatabase = async () => {
  const dbName = `db${uuid()}`;
  await rpn.put({ url: `${url}/${dbName}`, json: true });
  const documents = Array.from({ length: nbrDocuments }).map(() => ({ _id: uuid(), value: uuid() }));
  await fs.writeFile(path.join(dataPath, `${dbName}.json`), JSON.stringify(documents));
  await rpn.post({ url: `${url}/${dbName}/_bulk_docs`, json: true, body: { docs: [ddoc, ...documents] } });
  const t = Date.now();
  const result = await rpn.get({ url: `${url}/${dbName}/_design/test/_view/view?limit=0&update_seq=true`, json: true });
  console.log(result);
  console.log(`view indexing took ${Date.now() - t}`);
};

(async () => {
  await rpn.put({ url: `${url}/_users`, json: true });
  await generateDatabase();
  await generateDatabase();
  await generateDatabase();
  await generateDatabase();
})();
