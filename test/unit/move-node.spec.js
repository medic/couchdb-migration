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
  });

  describe('syncShards', () => {
    it('should sync shards for all dbs', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one', 'two', 'three']);
      sinon.stub(utils, 'syncShards').resolves({ ok: true });

      await moveNodeSpec.syncShards();

      expect(utils.getDbs.callCount).to.equal(1);
      expect(utils.syncShards.callCount).to.equal(3);
      expect(utils.syncShards.args).to.deep.equal([['one'], ['two'], ['three']]);
    });

    it('should throw error if all dbs fails', async () => {
      sinon.stub(utils, 'getDbs').rejects(new Error('omg'));
      await expect(moveNodeSpec.syncShards()).to.be.rejectedWith(Error, 'omg');
    });

    it('should throw error if sync shards fails', async () => {
      sinon.stub(utils, 'getDbs').resolves(['one', 'two', 'three']);
      sinon.stub(utils, 'syncShards').rejects(new Error('oh noes'));
      await expect(moveNodeSpec.syncShards()).to.be.rejectedWith(Error, 'oh noes');
    });
  });
});
