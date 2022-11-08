const rewire = require('rewire');
const { Response } = require('node-fetch');

let utils;
let fetchStub;

const stubProcess = ({ server= 'couchdb', user= 'admin', pass= 'pass' }={}) => {
  process.env.COUCHDB_SERVER = server;
  process.env.COUCHDB_USER = user;
  process.env.COUCHDB_PASSWORD = pass;

  utils = rewire('../../src/utils');
  fetchStub = sinon.stub();
  utils.__set__('fetch', fetchStub);
};

describe('utils', () => {
  beforeEach(() => {
    stubProcess();
  });

  describe('getUrl', () => {
    it('should return url for httpd', () => {
      const url = utils.getUrl('mypath');
      expect(url).to.equal('http://admin:pass@couchdb:5984/mypath');
    });

    it('should return url for chttp', () => {
      const url = utils.getUrl('a_path', true);
      expect(url).to.equal('http://admin:pass@couchdb:5986/a_path');
    });

    it('should take server, pass, and user from env', () => {
      stubProcess({ server: 'couch1', user: 'medic', pass: 'pwd' });
      const url = utils.getUrl('a_path', true);
      expect(url).to.equal('http://medic:pwd@couch1:5986/a_path');
    });
  });

  describe('request', () => {
    it('should do simple request', async () => {
      const responseText = 'response text';
      fetchStub.resolves(new Response(responseText, { status: 200 }));

      const response = await utils.request({ url: 'someurl', json: false });

      expect(response).to.equal(responseText);
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([ 'someurl', {}]);
    });

    it('should pass all params and return response when not json', async () => {
      const responseText = 'response text';
      fetchStub.resolves(new Response(responseText, { status: 200 }));

      const params = {
        headers: { a: 1, b: 2 },
        field: '1',
        something: '123'
      };

      const response = await utils.request({ url: 'someurl', ...params, json: false });

      expect(response).to.equal(responseText);
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([ 'someurl', params ]);
    });

    it('should pass all params and return response when json', async () => {
      const responseText = JSON.stringify({ response: 'text' });
      const body = { the: 'body' };
      fetchStub.resolves(new Response(responseText, { status: 200 }));

      const params = {
        headers: { a: 1, b: 2 },
        field: '1',
        something: '123',
      };

      const response = await utils.request({ url: 'someurl', body, ...params });

      expect(response).to.deep.equal({ response: 'text' });
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([
        'someurl',
        {
          headers: {
            a: 1,
            b: 2,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          field: '1',
          something: '123',
          body: JSON.stringify(body),
        }
      ]);
    });

    it('should throw error when fetch throws error', async () => {
      fetchStub.rejects({ an: 'error' });
      await expect(utils.request({ url: 'url' })).to.be.rejected.and.eventually.deep.equal({ an: 'error' });
    });

    it('should throw error when response not ok', async () => {
      fetchStub.resolves(new Response('whaaa', { status: 401, statusText: 'Unauthorized' }));
      await expect(utils.request({ url: 'url' })).to.be.rejectedWith(Error, 'HTTP Error Response: 401 Unauthorized');
    });

    it('should throw error when invalid json response', async () => {
      fetchStub.resolves(new Response('not json', { status: 200 }));
      await expect(utils.request({ url: 'url' })).to.be.rejectedWith(
        Error,
        'invalid json response body at  reason: Unexpected token o in JSON at position 1'
      );
    });
  });

  describe('getDbs', () => {
    it('should return the response of the _dbs endpoint', async () => {
      const dbs = ['one', 'two', 'three'];
      fetchStub.resolves(new Response(JSON.stringify(dbs), { status: 200 }));

      const result = await utils.getDbs();

      expect(result).to.deep.equal(dbs);

      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([
        'http://admin:pass@couchdb:5984/_all_dbs',
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      ]);
    });

    it('should throw errors', async () => {
      fetchStub.rejects({ an: 'error' });
      await expect(utils.getDbs()).to.be.rejected.and.eventually.deep.equal({ an: 'error' });
    });
  });

  describe('getMembership', () => {
    it('should return the response of the _membership endpoint', async () => {
      const membership = { all_nodes: ['1', '2'], cluster_nodes: ['1', '2', '3']};
      fetchStub.resolves(new Response(JSON.stringify(membership), { status: 200 }));

      const result = await utils.getMembership();

      expect(result).to.deep.equal(membership);

      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([
        'http://admin:pass@couchdb:5984/_membership',
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      ]);
    });

    it('should throw request errors', async () => {
      fetchStub.rejects({ an: 'error' });
      await expect(utils.getMembership()).to.be.rejected.and.eventually.deep.equal({ an: 'error' });
    });
  });

  describe('getDbMetadata', () => {
    it('should return db metadata ', async () => {
      const metadata = { the: 'metadata' };
      fetchStub.resolves(new Response(JSON.stringify(metadata), { status: 200 }));

      const result = await utils.getDbMetadata('thedb');

      expect(result).to.deep.equal(metadata);
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([
        'http://admin:pass@couchdb:5986/_dbs/thedb',
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      ]);
    });

    it('should throw an error when no db name provided', async () => {
      await expect(utils.getDbMetadata()).to.be.rejectedWith(Error, 'Missing database name');
    });

    it('should throw request errors', async () => {
      fetchStub.rejects({ an: 'error' });
      await expect(utils.getDbMetadata('db')).to.be.rejected.and.eventually.deep.equal({ an: 'error' });
    });
  });

  describe('updateDbMetadata', () => {
    it('should save the updated metadata', async () => {
      const metadata = { the: 'metadata' };
      const response = { ok: true, rev: 22 };
      fetchStub.resolves(new Response(JSON.stringify(response), { status: 200 }));

      const result = await utils.updateDbMetadata('thedb', metadata);

      expect(result).to.deep.equal(response);
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([
        'http://admin:pass@couchdb:5986/_dbs/thedb',
        {
          method: 'PUT',
          body: JSON.stringify(metadata),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      ]);
    });

    it('should throw an error when no db name provided', async () => {
      await expect(utils.updateDbMetadata()).to.be.rejectedWith(Error, 'Missing database name');
    });

    it('should throw an error when no metadata provided', async () => {
      await expect(utils.updateDbMetadata('name')).to.be.rejectedWith(Error, 'Missing or invalid database metadata');
    });

    it('should throw an error when invalid metadata provided', async () => {
      await expect(utils.updateDbMetadata('name')).to.be.rejectedWith(Error, 'Missing or invalid database metadata');
    });

    it('should throw request errors', async () => {
      fetchStub.rejects({ an: 'error' });
      await expect(utils.updateDbMetadata('db', { m: 'd' })).to.be.rejected.and.eventually.deep.equal({ an: 'error' });
    });
  });

  describe('getNodeInfo', () => {
    it('should return node info', async () => {
      const nodeInfo = { _id: 'couchdb@couchdb.1', _rev: 'rev' };
      fetchStub.resolves(new Response(JSON.stringify(nodeInfo), { status: 200 }));

      const response = await utils.getNodeInfo(nodeInfo._id);

      expect(response).to.deep.equal(nodeInfo);
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([
        'http://admin:pass@couchdb:5986/_nodes/couchdb@couchdb.1',
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      ]);
    });

    it('should throw error if missing node name', async () => {
      await expect(utils.getNodeInfo()).to.be.rejectedWith(Error, 'Missing node name');
    });

    it('should throw error if getting info fails', async () => {
      fetchStub.resolves(new Response(JSON.stringify({}), { status: 404 }));
      await expect(utils.getNodeInfo('name')).to.be.rejectedWith(Error, 'Error while getting node info');
    });
  });

  describe('deleteNode', () => {
    it('should delete node', async () => {
      const nodeInfo = { _id: 'couchdb@couchdb.1', _rev: 'the-rev' };
      fetchStub.resolves(new Response(JSON.stringify(nodeInfo), { status: 200 }));

      const response = await utils.deleteNode(nodeInfo);

      expect(response).to.deep.equal(nodeInfo);
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.args[0]).to.deep.equal([
        'http://admin:pass@couchdb:5986/_nodes/couchdb@couchdb.1?rev=the-rev',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      ]);
    });

    it('should throw error on invalid node info', async () => {
      await expect(utils.deleteNode()).to.be.rejectedWith(Error, 'Missing or invalid node metadata');
    });

    it('should throw error on missing node name', async () => {
      await expect(utils.deleteNode({ _rev: '1' })).to.be.rejectedWith(Error, 'Missing or invalid node metadata');
    });

    it('should throw error on missing node rev', async () => {
      await expect(utils.deleteNode({ _id: '2' })).to.be.rejectedWith(Error, 'Missing or invalid node metadata');
    });

    it('should throw error when deletion fails', async () => {
      const nodeInfo = { _id: 'couchdb@couchdb.1', _rev: 'the-rev' };
      fetchStub.rejects(new Response(JSON.stringify(nodeInfo), { status: 404 }));

      await expect(utils.deleteNode(nodeInfo)).to.be.rejectedWith(Error, 'Error while deleting node');
    });
  });

});
