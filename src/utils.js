const fetch = require('node-fetch');
const { COUCH_URL, COUCH_CLUSTER_PORT } = process.env;
const DEFAULT_COUCH_PORT = 5984;
const DEFAULT_COUCH_CLUSTER_PORT = 5986;
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;

let couchUrl;
let couchClusterUrl;

const testUrl = async (url) => {
  await module.exports.request({ url: url.toString(), json: false });
  return url;
};

const testCouchDb3Url = async () => {
  const url = new URL(COUCH_URL);
  url.pathname = '/_node/_local/_nodes';
  url.port = DEFAULT_COUCH_PORT;
  await module.exports.request({ url: url.toString(), json: false });

  url.pathname = '/_node/_local/';
  return url;
};

const prepareCouchUrl = async (cluster) => {
  if ((couchUrl && !cluster) || (couchClusterUrl && cluster)) {
    return;
  }

  if (!COUCH_URL) {
    throw new Error('Env variable COUCH_URL must be set');
  }

  if (!cluster) {
    try {
      const customUrl = new URL(COUCH_URL);
      const defaultUrl = new URL(COUCH_URL);
      defaultUrl.port = DEFAULT_COUCH_PORT;

      couchUrl = await Promise.any([
        testUrl(customUrl),
        testUrl(defaultUrl),
      ]);
    } catch (err) {
      throw new Error(
        'Failed to connect to CouchDb. Please verify that the COUCH_URL provided is reachable through docker network.'
      );
    }
    return;
  }

  try {
    const customUrl = new URL(COUCH_URL);
    customUrl.port = parseInt(COUCH_CLUSTER_PORT) || DEFAULT_COUCH_CLUSTER_PORT;
    const defaultUrl = new URL(COUCH_URL);
    defaultUrl.port = DEFAULT_COUCH_CLUSTER_PORT;

    couchClusterUrl = await Promise.any([
      testUrl(customUrl),
      testUrl(defaultUrl),
      testCouchDb3Url(),
    ]);
  } catch (err) {
    throw new Error(
      'Failed to connect to CouchDb Clustering API. ' +
      'Please verify that the COUCH_URL provided is reachable through docker network.'
    );
  }
};

const getUrl = async (path, cluster, query) => {
  await prepareCouchUrl(cluster);
  const url = new URL(cluster ? couchClusterUrl : couchUrl);
  url.pathname = (url.pathname + path).replace('//', '/');
  query && (url.search = query);
  return url.toString();
};

class HTTPResponseError extends Error {
  constructor(response, responseData) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`);
    this.response = responseData;
    this.status = response.status;
  }
}

const getResponseData = (response, json) => json ? response.json() : response.text();

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
    let responseData;
    try {
      responseData = await getResponseData(response, json);
    } catch (err) {
      responseData = response;
    }
    throw new HTTPResponseError(response, responseData);
  }

  return getResponseData(response, json);
};

const getDbs = async () => {
  const url = await getUrl('_all_dbs');
  try {
    return await request({ url });
  } catch (err) {
    console.error('Error while getting all databases');
    throw err;
  }
};

const getMembership = async () => {
  const url = await getUrl('_membership');
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
  const url = await getUrl(`_dbs/${dbName}`, true);
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

  const url = await getUrl(`_dbs/${dbName}`, true);
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

  const url = await getUrl(`_nodes/${nodeName}`, true);
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

  const url = await getUrl(`_nodes/${nodeInfo._id}`, true, `rev=${nodeInfo._rev}`);
  try {
    return await request({ url, method: 'DELETE' });
  } catch (err) {
    console.error('Error while deleting node', err);
    throw new Error('Error while deleting node');
  }
};

const syncShards = async (db) => {
  if (!db) {
    throw new Error('Missing db name');
  }
  const url = await getUrl(`${db}/_sync_shards`);
  try {
    return await request({ url, method: 'POST' });
  } catch (err) {
    console.error(`
    Error while syncing shards for db: ${db}`, err);
    throw new Error(`Error while syncing shards for db: ${db}`);
  }

};

const getShards = async () => {
  const url = await getUrl('_all_dbs', true);
  try {
    const clusterDbs = await request({ url });
    const re = /^shards\/([^/]+)\//;
    let match;
    const shards = clusterDbs
      .map(db => ((match = db.match(re)) && match && match[1]))
      .filter(value => value);
    return [...new Set(shards)];
  } catch (err) {
    console.error('Error while getting list of shards', err);
    throw new Error('Error while getting list of shards');
  }
};

const getNodes = async () => {
  const membership = await getMembership();
  return membership.all_nodes;
};

const getConfig = async (section, key) => {
  try {
    const nodes = await getNodes();
    const node = nodes[0];
    const url = await getUrl(`_node/${node}/_config/${section}/${key}`);
    return await request({ url });
  } catch (err) {
    if (err.status === 404) {
      return '';
    }
    console.error('Error when getting config', err);
    throw new Error('Error when getting config');
  }
};

const getCouchUrl = async () => {
  await prepareCouchUrl();
  return couchUrl;
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
  getConfig,
  getCouchUrl,
  prepareCouchUrl,
};
