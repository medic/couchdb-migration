const utils = require('./utils');
const NUM_RETRY = 100;
const TIMEOUT_RETRY = 1000; // 1 second

const isCouchUp = async () => {
  const url = utils.getUrl('/');
  try {
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
  let fulfilled;
  let retry = NUM_RETRY;
  do {
    fulfilled = await promiseFn();
    if (!fulfilled) {
      retry--;
      await new Promise(r => setTimeout(r, TIMEOUT_RETRY));
    }
  } while (retry > 0 && !fulfilled);

  return fulfilled;
};

const checkCouchUp = async () => {
  const isUp = await repeatRetry(isCouchUp);
  if (!isUp) {
    throw new Error('CouchDb is not up after 100 seconds.');
  }
};

const checkClusterReady = async (nbrNodes) => {
  const isReady = await repeatRetry(isClusterReady.bind({}, nbrNodes));
  if (!isReady) {
    throw new Error('CouchDb Cluster is not ready after 100 seconds.');
  }
};

module.exports = {
  checkCouchUp,
  checkClusterReady,
};
