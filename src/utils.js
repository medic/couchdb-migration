const fetch = require('node-fetch');

const { COUCHDB_SERVER, COUCHDB_USER, COUCHDB_PASSWORD, COUCH_PORT, COUCH_CLUSTER_PORT } = process.env;
const COUCH_HTTPD_PORT = COUCH_PORT || 5984;
const COUCH_CHTTPD_PORT = COUCH_CLUSTER_PORT || 5986;

const getUrl = (path, cluster) =>
  `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_SERVER}:${cluster? COUCH_CHTTPD_PORT : COUCH_HTTPD_PORT}/${path}`;

class HTTPResponseError extends Error {
  constructor(response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`);
    this.response = response;
  }
}

const request = async ({ url, json = true, ...moreOpts }) => {
  const opts = { ...moreOpts };
  if (json) {
    opts.headers = {
      ...(opts.headers || {}),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (opts.body) {
      opts.body = JSON.stringify(opts.body);
    }
  }

  const response = await fetch(url, opts);
  if (!response.ok) {
    throw new HTTPResponseError(response);
  }

  const data = json ? await response.json() : await response.text();
  return data;
};

const getDbs = async () => {
  const url = getUrl('_all_dbs');
  try {
    return await request({ url });
  } catch (err) {
    console.error('Error while getting all databases');
    throw err;
  }
};

const getMembership = async () => {
  const url = getUrl('_membership');
  try {
    return await request({ url });
  } catch (err) {
    console.error('Error while getting membership');
    throw err;
  }
};

const getDbMetadata = async (dbName) => {
  if (!dbName) {
    throw new Error('Missing database name');
  }
  const url = getUrl(`_dbs/${dbName}`, true);
  try {
    return await request({ url });
  } catch (err) {
    console.error('Error while getting database metadata');
    throw err;
  }
};

const updateDbMetadata = async (dbName, metadata) => {
  if (!dbName) {
    throw new Error('Missing database name');
  }
  if (!metadata || !(metadata instanceof Object)) {
    throw new Error('Missing or invalid database metadata');
  }

  const url = getUrl(`_dbs/${dbName}`, true);
  try {
    return await request({ url, method: 'PUT', body: metadata });
  } catch (err) {
    console.error('Error while updating database metadata');
    throw err;
  }
};

const getNodeInfo = async (nodeName) => {
  if (!nodeName) {
    throw new Error('Missing node name');
  }

  const url = getUrl(`_nodes/${nodeName}`, true);
  try {
    return await request({ url });
  } catch (err) {
    console.error('Error while getting node info', err);
    throw new Error('Error while getting node info');
  }
};

const deleteNode = async (nodeInfo) => {
  if (!nodeInfo || !nodeInfo._rev || !nodeInfo._id) {
    throw new Error('Missing or invalid node metadata');
  }

  const url = getUrl(`_nodes/${nodeInfo._id}?rev=${nodeInfo._rev}`, true);
  try {
    return await request({ url, method: 'DELETE' });
  } catch (err) {
    console.error('Error while deleting node', err);
    throw new Error('Error while deleting node');
  }
};

const syncShards = async (db) => {
  const url = getUrl(`${db}/_sync_shards`);
  return await request({ url, method: 'POST' });
};

const getShards = async () => {
  const dbs = await getDbs();
  const dbMetadata = await getDbMetadata(dbs[0]);
  return Object.keys(dbMetadata.by_range);
};

const getNodes = async () => {
  const membership = await getMembership();
  return membership.all_nodes;
};

module.exports = {
  request,
  getUrl,
  getDbs,
  getMembership,
  getDbMetadata,
  updateDbMetadata,
  getNodeInfo,
  deleteNode,
  syncShards,
  getShards,
  getNodes,
};
