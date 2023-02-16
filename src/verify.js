const utils = require('./utils');

const verifyViews = async (dbName, numDocs) => {
  if (!numDocs) {
    return true;
  }

  const url = await utils.getUrl(`${dbName}/_design_docs`, false, 'include_docs=true');
  const response = await utils.request({ url });

  const ddocsWithViews = response.rows.filter(row => row.doc && row.doc.views && Object.keys(row.doc.views).length);
  if (!ddocsWithViews.length) {
    return true;
  }
  for (const { doc: ddoc } of ddocsWithViews) {
    for (const view of Object.keys(ddoc.views)) {
      const url = await utils.getUrl(`${dbName}/${ddoc._id}/_view/${view}`, false, 'stale=ok&limit=0');
      const viewResponse = await utils.request({ url });

      if (viewResponse.total_rows > 0) {
        // at least one view being indexed means that the .shard folders for the database were moved successfully
        // some views might not index any documents
        return true;
      }
    }
  }

  return false;
};

const verifyDb = async (dbName) => {
  console.info(`Verifying ${dbName}`);
  await utils.syncShards(dbName);

  const url = await utils.getUrl(`${dbName}/_all_docs`, false, 'limit=0');
  const allDocsResponse = await utils.request({ url });

  const viewsIndexed = await verifyViews(dbName, allDocsResponse.total_rows);
  if (viewsIndexed) {
    console.info(`Database ${dbName} has passed migration checks.`);
  } else {
    console.warn(`
      Views of database ${dbName} are not indexed. 
      This can be caused by a migration failure or by the the views functions not indexing any documents.
    `);
  }
};

const verify = async () => {
  const allDbs = await utils.getDbs();
  for (const dbName of allDbs) {
    try {
      await verifyDb(dbName);
    } catch (err) {
      console.error('Error when checking database ', dbName, err);
      throw new Error(`Verification failed for database ${dbName}`);
    }
  }
};

module.exports = {
  verify,
};
