const utils = require('./utils');
const NUM_RETRY = 300;
const TIMEOUT_RETRY = 1000; // 1 second

const isCouchUp = async () => {
  try {
    const url = await utils.getUrl('/');
    await utils.request({ url });
    return true;
  } catch (err) {
    return false;
  }
};

const isClusterReady = async (expectedNodes) => {
  const nodes = await utils.getNodes();
  return nodes && nodes.length === expectedNodes;
};

const repeatRetry = async (promiseFn) => {
  let retry = NUM_RETRY;
  do {
    if (await promiseFn()) {
      return true;
    }
    retry--;
    await new Promise(r => setTimeout(r, TIMEOUT_RETRY));
  } while (retry > 0);

  return false;
};

const checkCouchUp = async () => {
  const isUp = await repeatRetry(isCouchUp);
  if (!isUp) {
    throw new Error('CouchDb is not up after 300 seconds.');
  }
};

const checkClusterReady = async (nbrNodes) => {
  const isReady = await repeatRetry(isClusterReady.bind({}, nbrNodes));
  if (!isReady) {
    throw new Error('CouchDb Cluster is not ready after 300 seconds.');
  }
};

module.exports = {
  checkCouchUp,
  checkClusterReady,
};
