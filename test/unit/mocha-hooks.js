const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.config.truncateThreshold = 0;

global.sinon = sinon;
global.expect = chai.expect;
process.env.COUCH_URL = 'http://admin:pass@couchdb-1.local:5984';

module.exports = {
  mochaHooks: {
    afterEach: () => sinon.restore(),
  },
  setupUtils: async (utils) => {
    sinon.stub(utils, 'request').resolves();
    await utils.prepareCouchUrl();
    await utils.prepareCouchUrl(true);
    sinon.restore();
  }
};
