const distributeShards = require('../../src/distribute-shards');
const utils = require('../../src/utils');

describe('distribute-shards', () => {
  describe('generateMatrix', () => {
    it('should distribute nodes among shards', async () => {
      sinon.stub(utils, 'getShards').resolves(['s1', 's2', 's3', 's4']);
      sinon.stub(utils, 'getNodes').resolves(['node1', 'node2']);

      const matrix = await distributeShards.generateMatrix();

      expect(matrix).to.deep.equal({
        s1: 'node1',
        s2: 'node2',
        s3: 'node1',
        s4: 'node2'
      });
    });

    describe('varied shard distribution', () => {
      it('should work with any number of shards and nodes', async () => {
        sinon.stub(utils, 'getShards').resolves(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']);
        sinon.stub(utils, 'getNodes').resolves(['node1', 'node2', 'node3']);

        const matrix = await distributeShards.generateMatrix();

        expect(matrix).to.deep.equal({
          s1: 'node1',
          s2: 'node2',
          s3: 'node3',
          s4: 'node1',
          s5: 'node2',
          s6: 'node3',
          s7: 'node1',
          s8: 'node2',
        });
      });

      it('should work with one node', async () => {
        sinon.stub(utils, 'getShards').resolves(['s1', 's2', 's3', 's4']);
        sinon.stub(utils, 'getNodes').resolves(['node1']);
        expect(await distributeShards.generateMatrix()).to.deep.equal({
          s1: 'node1',
          s2: 'node1',
          s3: 'node1',
          s4: 'node1',
        });
      });

      it('should work with one shard', async () => {
        sinon.stub(utils, 'getShards').resolves(['s1']);
        sinon.stub(utils, 'getNodes').resolves(['node1']);
        expect(await distributeShards.generateMatrix()).to.deep.equal({ s1: 'node1' });
      });
    });

  });
});
