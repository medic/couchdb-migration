const utils = require('../../src/utils');
const verify = require('../../src/verify');

const couchUrl = utils.couchUrl.toString();

describe('verify', () => {
  describe('verity', () => {
    it('should check every database', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one', 'two']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');

      utils.request.withArgs({ url: `${couchUrl}one/_all_docs?limit=0` }).resolves({ total_rows: 100 });
      utils.request.withArgs({ url: `${couchUrl}two/_all_docs?limit=0` }).resolves({ total_rows: 200 });

      utils.request.withArgs({ url: `${couchUrl}one/_design_docs?include_docs=true` }).resolves({
        rows: [
          { doc: { _id: '_design/one', views: { a: {}, b: {} } } },
          { doc: { _id: '_design/two', views: { c: {}, d: {} } } },
        ]
      });
      utils.request.withArgs({ url: `${couchUrl}two/_design_docs?include_docs=true` }).resolves({
        rows: [
          { doc: { _id: '_design/a', views: { 1: {}, 2: {} } } },
          { doc: { _id: '_design/b', views: { 3: {}, 4: {} } } },
        ]
      });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design/one/_view/a?stale=ok&limit=0` })
        .resolves({ total_rows: 1 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design/one/_view/b?stale=ok&limit=0` })
        .resolves({ total_rows: 2 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design/two/_view/c?stale=ok&limit=0` })
        .resolves({ total_rows: 4 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design/two/_view/d?stale=ok&limit=0` })
        .resolves({ total_rows: 12 });

      utils.request
        .withArgs({ url: `${couchUrl}two/_design/a/_view/1?stale=ok&limit=0` })
        .resolves({ total_rows: 12 });
      utils.request
        .withArgs({ url: `${couchUrl}two/_design/a/_view/2?stale=ok&limit=0` })
        .resolves({ total_rows: 1 });
      utils.request
        .withArgs({ url: `${couchUrl}two/_design/b/_view/3?stale=ok&limit=0` })
        .resolves({ total_rows: 22 });
      utils.request
        .withArgs({ url: `${couchUrl}two/_design/b/_view/4?stale=ok&limit=0` })
        .resolves({ total_rows: 1 });

      await verify.verify();

      expect(utils.syncShards.args).to.deep.equal([['one'], ['two']]);
      expect(utils.request.callCount).to.equal(12);
    });

    it('should handle databases with no docs', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}one/_all_docs?limit=0` }).resolves({ total_rows: 0 });

      await verify.verify();

      expect(utils.syncShards.args).to.deep.equal([['one']]);
      expect(utils.request.callCount).to.equal(1);
    });

    it('should handle databases with no ddocs', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}one/_all_docs?limit=0` }).resolves({ total_rows: 10 });
      utils.request.withArgs({ url: `${couchUrl}one/_design_docs?include_docs=true` }).resolves({ rows: [] });

      await verify.verify();

      expect(utils.syncShards.args).to.deep.equal([['one']]);
      expect(utils.request.callCount).to.equal(2);
    });

    it('should handle databases with no views', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}one/_all_docs?limit=0` }).resolves({ total_rows: 10 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design_docs?include_docs=true` })
        .resolves({ rows: [{ doc: { _id: '_design/a' } }] });

      await verify.verify();

      expect(utils.syncShards.args).to.deep.equal([['one']]);
      expect(utils.request.callCount).to.equal(2);
    });

    it('should pass verification when at least one view is indexed', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}one/_all_docs?limit=0` }).resolves({ total_rows: 10 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design_docs?include_docs=true` })
        .resolves({ rows: [{ doc: { _id: '_design/a', views: { a: {}, b: {} } } }] });

      utils.request
        .withArgs({ url: `${couchUrl}one/_design/a/_view/a?stale=ok&limit=0` })
        .resolves({ total_rows: 0 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design/a/_view/b?stale=ok&limit=0` })
        .resolves({ total_rows: 1 });


      await verify.verify();

      expect(utils.syncShards.args).to.deep.equal([['one']]);
      expect(utils.request.callCount).to.equal(4);
    });

    it('should pass verification when none of the views are indexed', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}one/_all_docs?limit=0` }).resolves({ total_rows: 10 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design_docs?include_docs=true` })
        .resolves({ rows: [{ doc: { _id: '_design/a', views: { a: {}, b: {} } } }] });

      utils.request
        .withArgs({ url: `${couchUrl}one/_design/a/_view/a?stale=ok&limit=0` })
        .resolves({ total_rows: 0 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design/a/_view/b?stale=ok&limit=0` })
        .resolves({ total_rows: 0 });
      sinon.spy(console, 'warn');

      await verify.verify();

      expect(utils.syncShards.args).to.deep.equal([['one']]);
      expect(utils.request.callCount).to.equal(4);
      expect(console.warn.args).to.deep.equal([[`
      Views of database one are not indexed. 
      This can be caused by a migration failure or by the the views functions not indexing any documents.
    `]]);
    });

    it('should fail verification when syncShards fails', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one']);
      sinon.stub(utils, 'syncShards').rejects(new Error('omg'));

      await expect(verify.verify()).to.be.rejectedWith('Verification failed for database one');

      expect(utils.syncShards.args).to.deep.equal([['one']]);
    });

    it('should fail verification when _all_docs fails', async () => {
      sinon.stub(utils, 'getDbs').resolves(['two']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}two/_all_docs?limit=0` }).rejects(new Error('wha'));

      await expect(verify.verify()).to.be.rejectedWith('Verification failed for database two');

      expect(utils.syncShards.args).to.deep.equal([['two']]);
      expect(utils.request.callCount).to.equal(1);
    });

    it('should fail verification when _design_docs fails', async () => {
      sinon.stub(utils, 'getDbs').resolves(['three']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}three/_all_docs?limit=0` }).resolves({ total_rows: 10 });
      utils.request.withArgs({ url: `${couchUrl}three/_design_docs?include_docs=true` }).rejects(new Error('t'));

      await expect(verify.verify()).to.be.rejectedWith('Verification failed for database three');

      expect(utils.syncShards.args).to.deep.equal([['three']]);
      expect(utils.request.callCount).to.equal(2);
    });

    it('should fail verification when view request fails', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one']);
      sinon.stub(utils, 'syncShards').resolves();
      sinon.stub(utils, 'request');
      utils.request.withArgs({ url: `${couchUrl}one/_all_docs?limit=0` }).resolves({ total_rows: 10 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design_docs?include_docs=true` })
        .resolves({ rows: [{ doc: { _id: '_design/a', views: { a: {}, b: {} } } }] });

      utils.request
        .withArgs({ url: `${couchUrl}one/_design/a/_view/a?stale=ok&limit=0` })
        .resolves({ total_rows: 0 });
      utils.request
        .withArgs({ url: `${couchUrl}one/_design/a/_view/b?stale=ok&limit=0` })
        .rejects(new Error('w'));


      await expect(verify.verify()).to.be.rejectedWith('Verification failed for database one');

      expect(utils.syncShards.args).to.deep.equal([['one']]);
      expect(utils.request.callCount).to.equal(4);
    });
  });
});
