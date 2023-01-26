const utils = require('../../src/utils');
const getEnv = require('../../src/get-env');

describe('get-env', () => {
  beforeEach(() => {
    sinon.spy(console, 'log');
  });
  describe('getEnv', () => {
    it('should log correct env', async () => {
      sinon.stub(utils, 'getConfig');
      sinon.stub(utils, 'getCouchUrl').resolves({ username: 'medic', password: 'pass' });
      utils.getConfig.withArgs('couch_httpd_auth', 'secret').resolves('thesecret');
      utils.getConfig.withArgs('couchdb', 'uuid').resolves('theuuid');

      await getEnv.getEnv();

      expect(console.log.args).to.deep.equal([
        ['COUCHDB_USER=medic'],
        ['COUCHDB_PASSWORD=pass'],
        ['COUCHDB_SECRET=thesecret'],
        ['COUCHDB_UUID=theuuid'],
      ]);

      expect(utils.getConfig.callCount).to.equal(2);
      expect(utils.getConfig.args).to.deep.equal([
        ['couch_httpd_auth', 'secret'],
        ['couchdb', 'uuid'],
      ]);
    });

    it('should throw error if getting config fails', async () => {
      sinon.stub(utils, 'getConfig').rejects(new Error('noooo'));
      await expect(getEnv.getEnv()).to.be.rejectedWith(Error, 'noooo');
    });
  });
});
