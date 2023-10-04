const utils = require('../../src/utils');
const viewIndexerProgress = require('../../src/view-indexer-progress');
const preIndexViews = require('../../src/pre-index-views');

const STAGING_URL = 'https://staging.dev.medicmobile.org/_couch/builds_4';
const COUCH_URL = 'http://admin:pass@couchdb-1.local:5984';
let viewIndexerProgressStop;

const genDdocsJson = (ddocs) => JSON.stringify({ docs: ddocs });
const genAttachmentData = (ddocs) => {
  const json = genDdocsJson(ddocs);
  const buffer = Buffer.from(json);
  return buffer.toString('base64');
};
describe('pre-index-views', () => {
  beforeEach(() => {
    viewIndexerProgressStop = sinon.stub();
    sinon.stub(utils, 'request').rejects();
    utils.request.withArgs({ url: `${COUCH_URL}/`, json: false }).resolves();
    sinon.stub(viewIndexerProgress, 'log').returns(viewIndexerProgressStop);
  });

  it('should download, install and index target version ddocs', async () => {
    const medicDdocs = [
      { _id: '_design/medic', version: '4.0.1', views: { medic1: {}, medic2: {} } },
      { _id: '_design/medic-client', version: '4.0.1', views: { client1: {}, client2: {} } },
    ];
    const sentinelDdocs = [{ _id: '_design/sentinel', version: '4.0.1', views: { sentinel: {} } }];

    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.0.1?attachments=true` }).resolves({
      _attachments: {
        'ddocs/logs.json': { data: genAttachmentData([{ _id: 'design/medic-logs', views: { one: {} } }]) },
        'ddocs/medic.json': { data: genAttachmentData(medicDdocs) },
        'ddocs/sentinel.json': { data: genAttachmentData(sentinelDdocs) },
        'ddocs/users-meta.json': { data: genAttachmentData([{ _id: 'design/medic-meta', views: { one: {} } }]) },
        'docker-compose/cht-core.yml': { data: 'whatever' },
        'docker-compose/cht-couchdb-clustered.yml': { data: 'whatever' },
        'docker-compose/cht-couchdb.yml': { data: 'whatever' },
      },
    });
    utils.request.withArgs({ url: `${COUCH_URL}/medic-logs` }).rejects({ status: 404 });
    utils.request.withArgs({ url: `${COUCH_URL}/medic-users-meta` }).rejects({ status: 404 });
    utils.request.withArgs({ url: `${COUCH_URL}/medic` }).resolves();
    utils.request.withArgs({ url: `${COUCH_URL}/medic-sentinel` }).resolves();

    utils.request.withArgs(sinon.match({ url: `${COUCH_URL}/medic/_bulk_docs` })).resolves();
    utils.request.withArgs(sinon.match({ url: `${COUCH_URL}/medic-sentinel/_bulk_docs` })).resolves();

    utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic/_view/medic1?limit=0` }).resolves();
    utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic/_view/medic2?limit=0` }).resolves();
    utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic-client/_view/client1?limit=0` }).resolves();
    utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic-client/_view/client2?limit=0` }).resolves();
    utils.request
      .withArgs({ url: `${COUCH_URL}/medic-sentinel/_design/:staged:sentinel/_view/sentinel?limit=0` })
      .resolves();

    await preIndexViews.preIndexViews('4.0.1');

    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic` }).callCount).to.equal(1);
    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic-sentinel` }).callCount).to.equal(1);
    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic-users-meta` }).callCount).to.equal(1);
    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic-logs` }).callCount).to.equal(1);

    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic/_bulk_docs` }).callCount).to.equal(1);
    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic/_bulk_docs` }).args[0]).to.deep.equal([ {
      url: `${COUCH_URL}/medic/_bulk_docs`,
      method: 'POST',
      body: {
        docs: [
          { _id: '_design/:staged:medic', version: 'preindex-4.0.1', views: { medic1: {}, medic2: {} } },
          { _id: '_design/:staged:medic-client', version: 'preindex-4.0.1', views: { client1: {}, client2: {} } },
        ]
      }
    }]);
    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic-sentinel/_bulk_docs` }).callCount).to.equal(1);
    expect(utils.request.withArgs({ url: `${COUCH_URL}/medic-sentinel/_bulk_docs` }).args[0]).to.deep.equal([{
      url: `${COUCH_URL}/medic-sentinel/_bulk_docs`,
      method: 'POST',
      body: {
        docs: [
          { _id: '_design/:staged:sentinel', version: 'preindex-4.0.1', views: { sentinel: {} } },
        ]
      }
    }]);

    expect(
      utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic/_view/medic1?limit=0` }).callCount
    ).to.equal(1);
    expect(
      utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic/_view/medic2?limit=0` }).callCount
    ).to.equal(1);
    expect(
      utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic-client/_view/client1?limit=0` }).callCount
    ).to.equal(1);
    expect(
      utils.request.withArgs({ url: `${COUCH_URL}/medic/_design/:staged:medic-client/_view/client2?limit=0` }).callCount
    ).to.equal(1);
    expect(
      utils.request
        .withArgs({ url: `${COUCH_URL}/medic-sentinel/_design/:staged:sentinel/_view/sentinel?limit=0` })
        .callCount
    ).to.equal(1);
  });

  it('should keep querying views until they respond', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.0.1?attachments=true` }).resolves({
      _attachments: {
        'ddocs/logs.json': { data: genAttachmentData([{ _id: '_design/logs', views: { one: {} } }]) },
      },
    });
    utils.request.withArgs({ url: `${COUCH_URL}/medic-logs` }).resolves();
    utils.request.withArgs(sinon.match({ url: `${COUCH_URL}/medic-logs/_bulk_docs` })).resolves();
    utils.request
      .withArgs({ url: `${COUCH_URL}/medic-logs/_design/:staged:logs/_view/one?limit=0` })
      .rejects({ response: { error: 'timeout' } })
      .onCall(100).resolves();

    await preIndexViews.preIndexViews('4.0.1');

    expect(
      utils.request.withArgs({ url: `${COUCH_URL}/medic-logs/_design/:staged:logs/_view/one?limit=0` }).callCount
    ).to.equal(101);
  });

  it('should skip ddocs with no views', async () => {
    const ddocs = [{ _id: '_design/test', views: { one: {} } }, { _id: '_design/test2' }];
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.1.0?attachments=true` }).resolves({
      _attachments: { 'ddocs/test.json': { data: genAttachmentData(ddocs) } },
    });
    utils.request.withArgs({ url: `${COUCH_URL}/medic-test` }).resolves();
    utils.request.withArgs(sinon.match({ url: `${COUCH_URL}/medic-test/_bulk_docs` })).resolves();
    utils.request.withArgs({ url: `${COUCH_URL}/medic-test/_design/:staged:test/_view/one?limit=0` }).resolves();

    await preIndexViews.preIndexViews('4.1.0');

    expect(utils.request.callCount).to.equal(4);
  });

  it('should skip dbs with no ddocs', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.1.0?attachments=true` }).resolves({
      _attachments: { 'ddocs/test.json': { data: genAttachmentData([]) } },
    });

    await preIndexViews.preIndexViews('4.1.0');

    expect(utils.request.callCount).to.equal(1);
  });

  it('should throw an error when no staging doc found', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.3.2?attachments=true` }).rejects({ status: 404 });
    await expect(
      preIndexViews.preIndexViews('4.3.2')
    ).to.be.rejected.and.eventually.deep.equal( { status: 404, message: 'Build for version 4.3.2 was not found.' });
    expect(utils.request.callCount).to.equal(1);
  });

  it('should throw an error when getting staging doc fails', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.1.1?attachments=true` }).rejects({ status: 500 });
    await expect(
      preIndexViews.preIndexViews('4.1.1')
    ).to.be.rejected.and.eventually.deep.equal(
      { status: 500, message: 'An unexpected error occurred when getting build for version 4.1.1' }
    );
    expect(utils.request.callCount).to.equal(1);
  });

  it('should throw an error when decoding attachments fails', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.0.1?attachments=true` }).resolves({
      _attachments: { 'ddocs/logs.json': { data: 'whatever' }, },
    });
    await expect(
      preIndexViews.preIndexViews('4.0.1')
    ).to.be.rejectedWith(Error, 'Unexpected token � in JSON at position 0');
    expect(utils.request.callCount).to.equal(1);
  });

  it('should throw error if writing ddocs fails', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.0.1?attachments=true` }).resolves({
      _attachments: {
        'ddocs/logs.json': { data: genAttachmentData([{ _id: '_design/logs', views: { one: {} } }]) },
      },
    });
    utils.request.withArgs({ url: `${COUCH_URL}/medic-logs` }).resolves();
    utils.request.withArgs(sinon.match({ url: `${COUCH_URL}/medic-logs/_bulk_docs` })).rejects(new Error('omg'));

    await expect(preIndexViews.preIndexViews('4.0.1')).to.be.rejectedWith(Error, 'omg');
    expect(utils.request.callCount).to.equal(3);
  });

  it('should throw error if checking the db fails', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.0.1?attachments=true` }).resolves({
      _attachments: {
        'ddocs/logs.json': { data: genAttachmentData([{ _id: '_design/logs', views: { one: {} } }]) },
      },
    });
    utils.request.withArgs({ url: `${COUCH_URL}/medic-logs` }).rejects(new Error('nooo'));

    await expect(preIndexViews.preIndexViews('4.0.1')).to.be.rejectedWith(Error, 'nooo');
    expect(utils.request.callCount).to.equal(2);
  });

  it('should throw an error if querying views fails', async () => {
    utils.request.withArgs({ url: `${STAGING_URL}/medic:medic:4.0.1?attachments=true` }).resolves({
      _attachments: {
        'ddocs/logs.json': { data: genAttachmentData([{ _id: '_design/logs', views: { one: {} } }]) },
      },
    });
    utils.request.withArgs({ url: `${COUCH_URL}/medic-logs` }).resolves();
    utils.request.withArgs(sinon.match({ url: `${COUCH_URL}/medic-logs/_bulk_docs` })).resolves();
    utils.request
      .withArgs({ url: `${COUCH_URL}/medic-logs/_design/:staged:logs/_view/one?limit=0` })
      .rejects(new Error('boom'));

    await expect(preIndexViews.preIndexViews('4.0.1')).to.be.rejectedWith(Error, 'boom');
    expect(utils.request.callCount).to.equal(4);

  });
});
