const utils = require('../../src/utils');
const { removeNode } = require('../../src/remove-node');

describe('remove-node', () => {
  it('should delete node', async () => {
    sinon.stub(utils, 'getNodeInfo').resolves({ node: 'info' });
    sinon.stub(utils, 'deleteNode').resolves();

    await removeNode('node');

    expect(utils.getNodeInfo.args).to.deep.equal([['node']]);
    expect(utils.deleteNode.args).to.deep.equal([[{ node: 'info' }]]);
  });

  it('should throw an error if no nodename is provided', async () => {
    await expect(removeNode()).to.be.rejectedWith(Error, 'Please specify node to remove');
  });

  it('should throw error when getting node info fails', async () => {
    sinon.stub(utils, 'getNodeInfo').rejects(new Error('faaaail'));
    await expect(removeNode('nodename')).to.be.rejectedWith(Error, 'faaaail');

    expect(utils.getNodeInfo.args).to.deep.equal([['nodename']]);
  });

  it('should throw error when deleting node fails', async () => {
    sinon.stub(utils, 'getNodeInfo').resolves({ node: 'data' });
    sinon.stub(utils, 'deleteNode').rejects(new Error('boom'));
    await expect(removeNode('thenode')).to.be.rejectedWith(Error, 'boom');

    expect(utils.getNodeInfo.args).to.deep.equal([['thenode']]);
    expect(utils.deleteNode.args).to.deep.equal([[{ node: 'data' }]]);
  });
});
