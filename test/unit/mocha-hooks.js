const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.config.truncateThreshold = 0;

global.sinon = sinon;
global.expect = chai.expect;
process.env.COUCH_URL = 'http://admin:pass@127.0.0.1:5984';

module.exports = {
  mochaHooks: {
    afterEach: () => sinon.restore(),
  }
};
