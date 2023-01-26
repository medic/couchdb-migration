const checkCouchUp = require('../../src/check-couch-up');
const utils = require('../../src/utils');
const { setupUtils } = require('./mocha-hooks');

let clock;
let originalSetTimeout;
const TIMEOUT_RETRY = 1000; // 1 second
const MAX_RETRIES = 100;

describe('check-couch-up', () => {
  beforeEach(async () => {
    await setupUtils(utils);
    originalSetTimeout = setTimeout;
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  describe('checkCouchUp', () => {
    it('should return true when couch is already up', async () => {
      sinon.stub(utils, 'request').resolves();
      await checkCouchUp.checkCouchUp();
      expect(utils.request.callCount).to.equal(1);
      expect(utils.request.args[0]).to.deep.equal([{ url: 'http://admin:pass@couchdb-1.local:5984/' }]);
    });

    it('should retry check when down', async () => {
      const retries = 53;
      sinon.stub(utils, 'request')
        .rejects({ status: 503 })
        .onCall(retries).resolves();

      const promise = checkCouchUp.checkCouchUp();
      Array.from({ length: retries }).map(() => originalSetTimeout(() => clock.tick(TIMEOUT_RETRY)));
      await promise;
      expect(utils.request.callCount).to.equal(retries + 1);
    });

    it('should throw an error after 100 retries', async () => {
      sinon.stub(utils, 'request').rejects({ status: 503 });
      try {
        const promise = checkCouchUp.checkCouchUp();
        Array.from({ length: MAX_RETRIES }).map(() => originalSetTimeout(() => clock.tick(TIMEOUT_RETRY)));
        await promise;
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('CouchDb is not up after 100 seconds.');
        expect(utils.request.callCount).to.equal(MAX_RETRIES);
      }
    });
  });

  describe('checkClusterReady', () => {
    it('should return true when couch cluster is ready', async () => {
      sinon.stub(utils, 'getNodes').resolves([1, 2, 3]);
      await checkCouchUp.checkClusterReady(3);
      expect(utils.getNodes.callCount).to.equal(1);
    });

    it('should retry check when not ready', async () => {
      const retries = 53;
      sinon.stub(utils, 'getNodes')
        .resolves([1])
        .onCall(retries).resolves([1, 2]);

      const promise = checkCouchUp.checkClusterReady(2);
      Array.from({ length: retries }).map(() => originalSetTimeout(() => clock.tick(TIMEOUT_RETRY)));
      await promise;
      expect(utils.getNodes.callCount).to.equal(retries + 1);
    });

    it('should throw an error after 100 retries', async () => {
      sinon.stub(utils, 'getNodes').resolves([3]);
      try {
        const promise = checkCouchUp.checkClusterReady(4);
        Array.from({ length: MAX_RETRIES }).map(() => originalSetTimeout(() => clock.tick(TIMEOUT_RETRY)));
        await promise;
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('CouchDb Cluster is not ready after 100 seconds.');
        expect(utils.getNodes.callCount).to.equal(MAX_RETRIES);
      }
    });
  });
});
