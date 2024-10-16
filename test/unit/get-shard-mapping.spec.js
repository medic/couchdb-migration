const { expect } = require('chai');
const sinon = require('sinon');
const utils = require('../../src/utils');
const { get_shard_mapping } = require('../../src/get-shard-mapping');

describe('get_shard_mapping', () => {
  let consoleWarnStub;
  let consoleErrorStub;

  beforeEach(() => {
    consoleWarnStub = sinon.stub(console, 'warn');
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('error handling', () => {
    it('should throw an error when utils.getDbs fails', async () => {
      sinon.stub(utils, 'getDbs').rejects(new Error('Failed to get DBs'));

      try {
        await get_shard_mapping();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.equal('Failed to get shard mapping');
        expect(consoleErrorStub.calledOnce).to.be.true;
        expect(consoleErrorStub.firstCall.args[0]).to.equal('Error getting shard mapping:');
      }
    });

    it('should throw an error when utils.getUrl fails', async () => {
      sinon.stub(utils, 'getDbs').resolves(['medic', 'medic-sentinel', 'medic-logs']);
      sinon.stub(utils, 'getUrl').rejects(new Error('Failed to get URL'));

      try {
        await get_shard_mapping();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.equal('Failed to get shard mapping');
        expect(consoleErrorStub.calledOnce).to.be.true;
        expect(consoleErrorStub.firstCall.args[0]).to.equal('Error getting shard mapping:');
      }
    });

    it('should throw an error when utils.request fails', async () => {
      sinon.stub(utils, 'getDbs').resolves(['medic', 'medic-sentinel', 'medic-logs']);
      sinon.stub(utils, 'getUrl').resolves('http://admin:pass@couchdb-1.local:5984/medic/_shards');
      sinon.stub(utils, 'request').rejects(new Error('Failed to get shard info'));

      try {
        await get_shard_mapping();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.equal('Failed to get shard mapping');
        expect(consoleErrorStub.calledOnce).to.be.true;
        expect(consoleErrorStub.firstCall.args[0]).to.equal('Error getting shard mapping:');
      }
    });
  });

  describe('functionalities', () => {
    it('should handle multiple databases with 8 shards and 3 nodes', async () => {
      sinon.stub(utils, 'getDbs').resolves(['medic', 'medic-sentinel', 'medic-logs']);
      sinon.stub(utils, 'getUrl')
        .onCall(0).resolves('http://admin:pass@couchdb-1.local:5984/medic/_shards')
        .onCall(1).resolves('http://admin:pass@couchdb-1.local:5984/medic-sentinel/_shards')
        .onCall(2).resolves('http://admin:pass@couchdb-1.local:5984/medic-logs/_shards');

      const shardInfo = {
        shards: {
          '00000000-1fffffff': ['node1'],
          '20000000-3fffffff': ['node2'],
          '40000000-5fffffff': ['node3'],
          '60000000-7fffffff': ['node1'],
          '80000000-9fffffff': ['node2'],
          'a0000000-bfffffff': ['node3'],
          'c0000000-dfffffff': ['node1'],
          'e0000000-ffffffff': ['node2']
        }
      };

      sinon.stub(utils, 'request').resolves(shardInfo);

      const result = await get_shard_mapping();
      const expectedResult = JSON.stringify({
        '00000000-1fffffff': 'node1',
        '20000000-3fffffff': 'node2',
        '40000000-5fffffff': 'node3',
        '60000000-7fffffff': 'node1',
        '80000000-9fffffff': 'node2',
        'a0000000-bfffffff': 'node3',
        'c0000000-dfffffff': 'node1',
        'e0000000-ffffffff': 'node2'
      });

      expect(result).to.equal(expectedResult);
      expect(utils.getDbs.calledOnce).to.be.true;
      expect(utils.getUrl.calledThrice).to.be.true;
      expect(utils.request.calledThrice).to.be.true;
    });

    it('should log a warning when multiple nodes are found for a shard range', async () => {
      sinon.stub(utils, 'getDbs').resolves(['medic', 'medic-sentinel']);
      sinon.stub(utils, 'getUrl')
        .onFirstCall().resolves('http://admin:pass@couchdb-1.local:5984/medic/_shards')
        .onSecondCall().resolves('http://admin:pass@couchdb-1.local:5984/medic-sentinel/_shards');
      sinon.stub(utils, 'request')
        .onFirstCall().resolves({
          shards: {
            '00000000-1fffffff': ['node1', 'node2']
          }
        })
        .onSecondCall().resolves({
          shards: {
            '20000000-3fffffff': ['node3']
          }
        });

      await get_shard_mapping();

      expect(consoleWarnStub.calledOnce).to.be.true;
      expect(consoleWarnStub.firstCall.args[0]).to.include('Unexpected number of nodes for range 00000000-1fffffff: 2');
    });

    it('should handle null or undefined shard info', async () => {
      sinon.stub(utils, 'getDbs').resolves(['medic', 'medic-sentinel', 'medic-logs']);
      sinon.stub(utils, 'getUrl').resolves('http://admin:pass@couchdb-1.local:5984/medic/_shards');
      sinon.stub(utils, 'request').resolves(null);

      try {
        await get_shard_mapping();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.equal('Failed to get shard mapping');
        expect(consoleErrorStub.calledOnce).to.be.true;
        expect(consoleErrorStub.firstCall.args[0]).to.equal('Error getting shard mapping:');
        expect(utils.getDbs.calledOnce).to.be.true;
        expect(utils.getUrl.calledOnce).to.be.true;
        expect(utils.request.calledOnce).to.be.true;
      }
    });

    it('should handle malformed shard info', async () => {
      sinon.stub(utils, 'getDbs').resolves(['medic', 'medic-sentinel', 'medic-logs']);
      sinon.stub(utils, 'getUrl').resolves('http://admin:pass@couchdb-1.local:5984/medic/_shards');
      sinon.stub(utils, 'request').resolves({ invalid: 'data' });

      try {
        await get_shard_mapping();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.equal('Failed to get shard mapping');
        expect(consoleErrorStub.calledOnce).to.be.true;
        expect(consoleErrorStub.firstCall.args[0]).to.equal('Error getting shard mapping:');
        expect(utils.getDbs.calledOnce).to.be.true;
        expect(utils.getUrl.calledOnce).to.be.true;
        expect(utils.request.calledOnce).to.be.true;
      }
    });

    it('should handle shard info with empty node list', async () => {
      const dbs = ['medic', 'medic-sentinel', 'medic-logs'];
      sinon.stub(utils, 'getDbs').resolves(dbs);
      const getUrlStub = sinon.stub(utils, 'getUrl');
      dbs.forEach((db, index) => {
        getUrlStub.onCall(index).resolves(`http://admin:pass@couchdb-1.local:5984/${db}/_shards`);
      });
      sinon.stub(utils, 'request').resolves({
        shards: {
          '00000000-1fffffff': []
        }
      });
    
      const result = await get_shard_mapping();
      
      expect(result).to.equal('{}');
      expect(utils.getDbs.calledOnce).to.be.true;
      expect(utils.getUrl.callCount).to.equal(dbs.length);
      expect(utils.request.callCount).to.equal(dbs.length);
      expect(consoleWarnStub.callCount).to.equal(dbs.length);
      dbs.forEach((db) => {
        expect(consoleWarnStub.calledWith(`Unexpected number of nodes for range 00000000-1fffffff: 0`)).to.be.true;
      });
    });
  });
});
