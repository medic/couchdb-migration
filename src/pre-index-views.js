const utils = require('./utils');
const viewIndexerProgress = require('./view-indexer-progress');

const buildsUrl = 'https://staging.dev.medicmobile.org/_couch/builds_4';
const DDOC_DB_RE = /^ddocs\/(.+)\.json$/;
const TIMEOUT_ERROR = 'timeout';

const decodeAttachmentData = (data) => {
  try {
    const buffer = Buffer.from(data, 'base64');
    return JSON.parse(buffer.toString('utf-8'));
  } catch (err) {
    console.error('Error while decoding attachment data');
    throw err;
  }
};

const getDDocs = async (version) => {
  const buildUrl = `${buildsUrl}/medic:medic:${version}?attachments=true`;
  let build;
  try {
    build = await utils.request({ url: buildUrl });
  } catch (err) {
    if (err.status === 404) {
      err.message = `Build for version ${version} was not found.`;
    } else {
      err.message = `An unexpected error occurred when getting build for version ${version}`;
    }
    throw err;
  }

  const ddocs = Object.keys(build._attachments).filter(attachment => DDOC_DB_RE.test(attachment));
  const ddocsForDb = Object.assign(...ddocs.map(ddoc => {
    const match = ddoc.match(DDOC_DB_RE);
    let dbName = match && match[1];

    const attachment = decodeAttachmentData(build._attachments[ddoc].data);
    if (!attachment || !attachment.docs || !attachment.docs.length) {
      return {};
    }

    dbName = dbName === 'medic' ? dbName : `medic-${dbName}`;
    return { [dbName]: attachment.docs };
  }));

  return ddocsForDb;
};

const dbExists = async (dbName) => {
  try {
    const url = await utils.getUrl(dbName);
    await utils.request({ url });
    return true;
  } catch (err) {
    if (err.status === 404) {
      return false;
    }
    throw err;
  }
};

const getStagedDdocs = async (ddocsForDb) => {
  const stagedDdocs = {};
  for (const [dbName, ddocs] of Object.entries(ddocsForDb)) {
    if (!await dbExists(dbName)) {
      continue;
    }

    stagedDdocs[dbName] = ddocs.map(ddoc => {
      ddoc._id = ddoc._id.replace('_design/', '_design/:staged:');
      ddoc.version = `preindex-${ddoc.version}`;

      return ddoc;
    });
  }

  return stagedDdocs;
};

const saveStagedDdocs = async (stagedDdocs) => {
  for (const [dbName, ddocs] of Object.entries(stagedDdocs)) {
    const url = await utils.getUrl(`${dbName}/_bulk_docs`);
    await utils.request({ url, body: { docs: ddocs }, method: 'POST' });
  }
};

const indexView = async (dbName, ddocId, viewName) => {
  do {
    try {
      const url = await utils.getUrl(`/${dbName}/${ddocId}/_view/${viewName}`, false, `limit=0`);
      return await utils.request({ url });
    } catch (err) {
      const timeoutError = err && err.response && TIMEOUT_ERROR.includes(err.response.error);
      if (timeoutError) {
        continue; // views still indexing - try again
      }
      throw err;
    }
    // eslint-disable-next-line no-constant-condition
  } while (true);
};

const indexStagedDdocs = async (stagedDdocs) => {
  const viewIndexPromises = [];
  for (const [dbName, ddocs] of Object.entries(stagedDdocs)) {
    for (const ddoc of ddocs) {
      if (!ddoc.views || !Object.keys(ddoc.views)) {
        continue;
      }
      const indexPromises = Object
        .keys(ddoc.views)
        .map(view => indexView(dbName, ddoc._id, view));
      viewIndexPromises.push(...indexPromises);
    }
  }
  await Promise.all(viewIndexPromises);
};

const preIndexViews = async (version) => {
  const ddocs = await getDDocs(version);
  const stagedDdocs = await getStagedDdocs(ddocs);
  await saveStagedDdocs(stagedDdocs);
  console.log('Indexing views:');
  const stopQueryingIndexes = viewIndexerProgress.log();
  await indexStagedDdocs(stagedDdocs);
  stopQueryingIndexes();
};

module.exports = {
  preIndexViews,
};
