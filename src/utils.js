const fetch = require('node-fetch');
const { COUCH_URL } = process.env;

if (!COUCH_URL) {
  throw new Error('Env variable COUCH_URL must be set');
}

const couchUrl = new URL(COUCH_URL);
couchUrl.port = 5984;
const couchClusterUrl = new URL(couchUrl);
couchClusterUrl.port = 5986;

const getUrl = (path, cluster, query) => {
  const url = new URL(cluster ? couchClusterUrl : couchUrl);
  url.pathname = path;
  query && (url.search = query);
  return url.toString();
};

class HTTPResponseError extends Error {
  constructor(response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`);
    this.response = response;
    this.status = response.status;
  }
}

const getResponseData = async (response, json) => json ? await response.json() : await response.text();

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
    throw new HTTPResponseError(responseData);
  }

  return getResponseData(response, json);
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

  const url = getUrl(`_nodes/${nodeInfo._id}`, true, `rev=${nodeInfo._rev}`);
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
  const url = getUrl(`${db}/_sync_shards`);
  try {
    return await request({ url, method: 'POST' });
  } catch (err) {
    console.error(`Error while syncing shards for db: ${db}`, err);
    throw new Error(`Error while syncing shards for db: ${db}`);
  }

};

const getShards = async () => {
  const url = getUrl('_all_dbs', true);
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
    const url = getUrl(`_node/${node}/_config/${section}/${key}`);
    return await request({ url });
  } catch (err) {
    if (err.status === 404) {
      return '';
    }
    console.error('Error when getting config', err);
    throw new Error('Error when getting config');
  }
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
  couchUrl,
};
