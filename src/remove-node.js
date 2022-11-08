const utils = require('./utils');

const validateCall = (nodeName) => {
  if (!nodeName) {
    throw new Error('Please specify node to remove');
  }
};

const removeNode = async (nodename) => {
  validateCall(nodename);
  const nodeInfo = await utils.getNodeInfo(nodename);
  await utils.deleteNode(nodeInfo);
};

module.exports = {
  removeNode,
};
