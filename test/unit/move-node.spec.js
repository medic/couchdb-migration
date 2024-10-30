const moveNodeSpec = require('../../src/move-node');
const moveShard = require('../../src/move-shard');
const utils = require('../../src/utils');

describe('move-node', () => {
  describe('moveNode', () => {
    it('should move all existing shards to the one existent node', async () => {
      sinon.stub(utils, 'getNodes').resolves(['one']);
      sinon.stub(utils, 'getShards').resolves(['shard1', 'shard2', 'shard3', 'shard4']);
      sinon.stub(moveShard, 'moveShard').resolves(['oldnode']);

      const result = await moveNodeSpec.moveNode();
      expect(result).to.deep.equal(['oldnode']);
      expect(utils.getNodes.callCount).to.equal(1);
      expect(utils.getShards.callCount).to.equal(1);
      expect(moveShard.moveShard.callCount).to.equal(4);
      expect(moveShard.moveShard.args).to.deep.equal([
        ['shard1', 'one'],
        ['shard2', 'one'],
        ['shard3', 'one'],
        ['shard4', 'one'],
      ]);
    });

    it('should move all existing shards to the indicated node', async () => {
      sinon.stub(utils, 'getShards').resolves(['shard_1', 'shard_2', 'shard_3', 'shard_4']);
      sinon.stub(moveShard, 'moveShard').resolves(['oldnode']);

      const result = await moveNodeSpec.moveNode('toNode');
      expect(result).to.deep.equal(['oldnode']);
      expect(utils.getShards.callCount).to.equal(1);
      expect(moveShard.moveShard.callCount).to.equal(4);
      expect(moveShard.moveShard.args).to.deep.equal([
        ['shard_1', 'toNode'],
        ['shard_2', 'toNode'],
        ['shard_3', 'toNode'],
        ['shard_4', 'toNode'],
      ]);
    });

    it('should move shards from more than one node', async () => {
      sinon.stub(utils, 'getShards').resolves(['shard_1', 'shard_2', 'shard_3', 'shard_4']);
      sinon.stub(moveShard, 'moveShard');
      moveShard.moveShard.withArgs('shard_1').resolves(['node1', 'node2']);
      moveShard.moveShard.withArgs('shard_2').resolves(['node1']);
      moveShard.moveShard.withArgs('shard_3').resolves(['node2']);
      moveShard.moveShard.withArgs('shard_4').resolves(['node2']);

      const result = await moveNodeSpec.moveNode('new');
      expect(result).to.deep.equal(['node1', 'node2']);
      expect(utils.getShards.callCount).to.equal(1);
      expect(moveShard.moveShard.callCount).to.equal(4);
      expect(moveShard.moveShard.args).to.deep.equal([
        ['shard_1', 'new'],
        ['shard_2', 'new'],
        ['shard_3', 'new'],
        ['shard_4', 'new'],
      ]);
    });

    it('should throw error if no arg is passed and there is more than one node', async () => {
      sinon.stub(utils, 'getNodes').resolves(['one', 'two']);
      await expect(moveNodeSpec.moveNode()).to.be.rejectedWith(Error, 'More than one node found.');
      expect(utils.getNodes.callCount).to.equal(1);
    });

    it('should throw error if getting nodes fails', async () => {
      sinon.stub(utils, 'getNodes').rejects(new Error('massive fail'));
      await expect(moveNodeSpec.moveNode()).to.be.rejectedWith(Error, 'massive fail');
    });

    it('should throw error if getting shards fails', async () => {
      sinon.stub(utils, 'getNodes').resolves(['one']);
      sinon.stub(utils, 'getShards').rejects(new Error('new fail'));
      await expect(moveNodeSpec.moveNode()).to.be.rejectedWith(Error, 'new fail');
    });

    it('should throw error if moving node fails', async () => {
      sinon.stub(utils, 'getNodes').resolves(['one']);
      sinon.stub(utils, 'getShards').resolves(['shard1', 'shard2', 'shard3', 'shard4']);
      sinon.stub(moveShard, 'moveShard').rejects(new Error('holdupaminute'));

      await expect(moveNodeSpec.moveNode()).to.be.rejectedWith(Error, 'holdupaminute');
    });

    it('should handle multi-node migration in clustered CouchDB', async () => {
      const shardMap = {
        '00000000-1fffffff': { 'medic': 'node1', 'medic-sentinel': 'node1' },
        '20000000-3fffffff': { 'medic': 'node2', 'medic-sentinel': 'node2' },
        '40000000-5fffffff': { 'medic': 'node1', 'medic-sentinel': 'node1' },
        '60000000-7fffffff': { 'medic': 'node2', 'medic-sentinel': 'node2' }
      };
      const toNode = { 'node1': 'node3' };

      sinon.stub(moveShard, 'moveShard').resolves(['node1']);
      const consoleLogStub = sinon.stub(console, 'log');

      const result = await moveNodeSpec.moveNode(toNode, shardMap);

      expect(result).to.deep.equal(['node1']);
      expect(moveShard.moveShard.callCount).to.equal(4); // 2 shards moved for 2 dbs
      expect(moveShard.moveShard.args).to.deep.equal([
        ['00000000-1fffffff', 'node3', 'medic'],
        ['00000000-1fffffff', 'node3', 'medic-sentinel'],
        ['40000000-5fffffff', 'node3', 'medic'],
        ['40000000-5fffffff', 'node3', 'medic-sentinel']
      ]);
      expect(consoleLogStub.calledWith('Migrating from node1 to node3')).to.be.true;
      expect(consoleLogStub.calledWith('Moving shard 00000000-1fffffff for db medic from node1 to node3')).to.be.true;
      expect(consoleLogStub.calledWith(
        'Moving shard 00000000-1fffffff for db medic-sentinel from node1 to node3')).to.be.true;
      expect(consoleLogStub.calledWith('Moving shard 40000000-5fffffff for db medic from node1 to node3')).to.be.true;
      expect(consoleLogStub.calledWith(
        'Moving shard 40000000-5fffffff for db medic-sentinel from node1 to node3')).to.be.true;
    });

    it('should throw an error if shard map JSON is missing in multi-node migration', async () => {
      const toNode = { 'node1': 'node3' };

      await expect(moveNodeSpec.moveNode(toNode))
        .to.be.rejectedWith(Error, 'Shard map JSON is required for multi-node migration');
    });

    it('should handle case where old node is not in any shard range', async () => {
      const shardMap = {
        '00000000-1fffffff': { 'medic': 'node2', 'medic-sentinel': 'node2' },
        '20000000-3fffffff': { 'medic': 'node2', 'medic-sentinel': 'node2' }
      };
      const toNode = { 'node1': 'node3' };

      sinon.stub(moveShard, 'moveShard').resolves([]);

      const result = await moveNodeSpec.moveNode(toNode, shardMap);

      expect(result).to.deep.equal(['node1']);
      expect(moveShard.moveShard.callCount).to.equal(0);
    });

    it('should handle moving nodes when shard distribution differs across databases', async () => {
      const shardMap = {
        '00000000-1fffffff': { 'medic': 'node1', 'medic-sentinel': 'node2' },
        '20000000-3fffffff': { 'medic': 'node2', 'medic-sentinel': 'node3' },
        '40000000-5fffffff': { 'medic': 'node3', 'medic-sentinel': 'node1' },
        '60000000-7fffffff': { 'medic': 'node1', 'medic-sentinel': 'node2' }
      };
      const toNode = { 'node1': 'node3' };

      sinon.stub(moveShard, 'moveShard').resolves(['node1']);
      const consoleLogStub = sinon.stub(console, 'log');

      const result = await moveNodeSpec.moveNode(toNode, shardMap);

      expect(result).to.deep.equal(['node1']);
      expect(moveShard.moveShard.callCount).to.equal(3);
      expect(moveShard.moveShard.args).to.deep.equal([
        ['00000000-1fffffff', 'node3', 'medic'],
        ['40000000-5fffffff', 'node3', 'medic-sentinel'],
        ['60000000-7fffffff', 'node3', 'medic']
      ]);
      expect(consoleLogStub.calledWith('Migrating from node1 to node3')).to.be.true;
      expect(consoleLogStub.calledWith('Moving shard 00000000-1fffffff for db medic from node1 to node3')).to.be.true;
      expect(consoleLogStub.calledWith(
        'Moving shard 40000000-5fffffff for db medic-sentinel from node1 to node3')).to.be.true;
      expect(consoleLogStub.calledWith('Moving shard 60000000-7fffffff for db medic from node1 to node3')).to.be.true;

      // Check that we're not moving shards that aren't on node1 according to the shardmap
      expect(moveShard.moveShard.calledWith('20000000-3fffffff', 'node3')).to.be.false;
    });
  });

  describe('syncShards', () => {

    afterEach(() => {
      sinon.restore();
    });

    it('should sync shards for all dbs', async () => {
      sinon.stub(utils, 'isClusterComplete').resolves(true);
      sinon.stub(utils, 'getDbs').resolves(['one', 'two', 'three']);
      sinon.stub(utils, 'syncShards').resolves({ ok: true });

      await moveNodeSpec.syncShards();

      expect(utils.isClusterComplete.callCount).to.equal(1);
      expect(utils.getDbs.callCount).to.equal(1);
      expect(utils.syncShards.callCount).to.equal(3);
      expect(utils.syncShards.args).to.deep.equal([['one'], ['two'], ['three']]);
    });

    it('should sync shards when cluster is complete', async () => {
      sinon.stub(utils, 'isClusterComplete').resolves(true);
      sinon.stub(utils, 'getDbs').resolves(['db1', 'db2']);
      sinon.stub(utils, 'syncShards').resolves({ ok: true });
      const consoleLogStub = sinon.stub(console, 'log');

      await moveNodeSpec.syncShards();

      expect(utils.isClusterComplete.callCount).to.equal(1);
      expect(utils.getDbs.callCount).to.equal(1);
      expect(utils.syncShards.callCount).to.equal(2);
      expect(utils.syncShards.args).to.deep.equal([['db1'], ['db2']]);
      expect(consoleLogStub.calledWith('Shards synchronized.')).to.be.true;

      consoleLogStub.restore();
    });

    it('should skip syncing shards when cluster is incomplete', async () => {
      sinon.stub(utils, 'isClusterComplete').resolves(false);
      const consoleLogStub = sinon.stub(console, 'log');
      const getDbsStub = sinon.stub(utils, 'getDbs');
      const syncShardsStub = sinon.stub(utils, 'syncShards');

      await moveNodeSpec.syncShards();

      expect(utils.isClusterComplete.callCount).to.equal(1);
      expect(getDbsStub.notCalled).to.be.true;
      expect(syncShardsStub.notCalled).to.be.true;
      expect(consoleLogStub.calledWith(
        'Multi-node migration detected. Shard synchronization will be run once all nodes have been migrated.'
      )).to.be.true;

      consoleLogStub.restore();
    });

    it('should throw error if isClusterComplete fails', async () => {
      const error = new Error('membership error');
      sinon.stub(utils, 'isClusterComplete').rejects(error);

      await expect(moveNodeSpec.syncShards()).to.be.rejectedWith('membership error');
    });

    it('should sync shards for all dbs when cluster has one node', async () => {
      sinon.stub(utils, 'isClusterComplete').resolves(true);
      sinon.stub(utils, 'getDbs').resolves(['db1']);
      sinon.stub(utils, 'syncShards').resolves({ ok: true });
      const consoleLogStub = sinon.stub(console, 'log');

      await moveNodeSpec.syncShards();

      expect(utils.isClusterComplete.callCount).to.equal(1);
      expect(utils.getDbs.callCount).to.equal(1);
      expect(utils.syncShards.callCount).to.equal(1);
      expect(utils.syncShards.args).to.deep.equal([['db1']]);
      expect(consoleLogStub.calledWith('Shards synchronized.')).to.be.true;

      consoleLogStub.restore();
    });

    it('should throw error if getDbs fails', async () => {
      sinon.stub(utils, 'isClusterComplete').resolves(true);
      sinon.stub(utils, 'getDbs').rejects(new Error('omg'));

      await expect(moveNodeSpec.syncShards()).to.be.rejectedWith('omg');
    });

    it('should throw error if syncShards fails', async () => {
      sinon.stub(utils, 'isClusterComplete').resolves(true);
      sinon.stub(utils, 'getDbs').resolves(['one', 'two', 'three']);
      sinon.stub(utils, 'syncShards').rejects(new Error('oh noes'));
      await expect(moveNodeSpec.syncShards()).to.be.rejectedWith('oh noes');
    });
  });
});
