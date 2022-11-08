const utils = require('../../src/utils');
const { moveShard } = require('../../src/move-shard');

describe('move-shard', () => {
  it('should throw an error if no shard is provided', async () => {
    await expect(moveShard()).to.be.rejectedWith(Error, 'Please specify shard');
  });

  it('should throw an error if no node is provided', async () => {
    await expect(moveShard('shard')).to.be.rejectedWith(Error, 'Please specify destination node');
  });

  it('should update metadata for all databases', async () => {
    sinon.stub(utils, 'getDbs').resolves(['db1', 'db2']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1', 'node2', 'node3'] });
    sinon.stub(utils, 'getDbMetadata');
    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node1'],
        ['add', 'shard4', 'node1'],
      ],
      by_node: {
        node1: ['shard1', 'shard2', 'shard3', 'shard4'],
      },
      by_range: {
        shard1: ['node1'],
        shard2: ['node1'],
        shard3: ['node1'],
        shard4: ['node1'],
      },
    };

    const db2Metadata = {
      _id: 'db2',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node2'],
        ['add', 'shard4', 'node2'],
      ],
      by_node: {
        node1: ['shard1', 'shard2'],
        node2: ['shard3', 'shard4'],
      },
      by_range: {
        shard1: ['node1'],
        shard2: ['node1'],
        shard3: ['node2'],
        shard4: ['node2'],
      },
    };

    utils.getDbMetadata.withArgs('db1').resolves(db1Metadata);
    utils.getDbMetadata.withArgs('db2').resolves(db2Metadata);

    sinon.stub(utils, 'updateDbMetadata').resolves();

    await moveShard('shard1', 'node3');

    expect(utils.getDbs.callCount).to.equal(1);
    expect(utils.getDbMetadata.args).to.deep.equal([['db1'], ['db2'] ]);
    expect(utils.updateDbMetadata.callCount).to.equal(2);

    expect(utils.updateDbMetadata.args[0]).to.deep.equal([
      'db1',
      {
        _id: 'db1',
        changelog: [
          ['add', 'shard1', 'node1'],
          ['add', 'shard2', 'node1'],
          ['add', 'shard3', 'node1'],
          ['add', 'shard4', 'node1'],
          ['remove', 'shard1', 'node1'],
          ['add', 'shard1', 'node3'],
        ],
        by_node: {
          node1: ['shard2', 'shard3', 'shard4'],
          node3: ['shard1'],
        },
        by_range: {
          shard1: ['node3'],
          shard2: ['node1'],
          shard3: ['node1'],
          shard4: ['node1'],
        },
      },
    ]);
  });

  it('should not update metadata if shard is already in the right node', async () => {
    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1', 'node2', 'node3'] });
    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node2'],
        ['add', 'shard4', 'node2'],
      ],
      by_node: {
        node1: ['shard1', 'shard2'],
        node2: ['shard3', 'shard4'],
      },
      by_range: {
        shard1: ['node1'],
        shard2: ['node1'],
        shard3: ['node2'],
        shard4: ['node2'],
      },
    };

    sinon.stub(utils, 'getDbMetadata').resolves(db1Metadata);
    sinon.stub(utils, 'updateDbMetadata');

    await moveShard('shard1', 'node1');

    expect(utils.updateDbMetadata.callCount).to.equal(0);
  });

  it('should not update metadata if database does not use shard', async () => {
    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1', 'node2', 'node3'] });
    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node2'],
        ['add', 'shard4', 'node2'],
      ],
      by_node: {
        node1: ['shard2'],
        node2: ['shard3', 'shard4'],
      },
      by_range: {
        shard2: ['node1'],
        shard3: ['node2'],
        shard4: ['node2'],
      },
    };

    sinon.stub(utils, 'getDbMetadata').resolves(db1Metadata);
    sinon.stub(utils, 'updateDbMetadata');

    await moveShard('shard1', 'node1');

    expect(utils.updateDbMetadata.callCount).to.equal(0);
  });

  it('should handle case when no shards are assigned to node', async () => {
    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1', 'node2'] });

    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node1'],
        ['add', 'shard4', 'node1'],
      ],
      by_node: {
        node1: ['shard1', 'shard2', 'shard3', 'shard4'],
      },
      by_range: {
        shard1: ['node1'],
        shard2: ['node1'],
        shard3: ['node1'],
        shard4: ['node1'],
      },
    };
    sinon.stub(utils, 'getDbMetadata').resolves(db1Metadata);
    sinon.stub(utils, 'updateDbMetadata').resolves();

    await moveShard('shard1', 'node2');

    expect(utils.updateDbMetadata.callCount).to.equal(1);
    expect(utils.updateDbMetadata.args[0]).to.deep.equal([
      'db1',
      {
        _id: 'db1',
        changelog: [
          ['add', 'shard1', 'node1'],
          ['add', 'shard2', 'node1'],
          ['add', 'shard3', 'node1'],
          ['add', 'shard4', 'node1'],
          ['remove', 'shard1', 'node1'],
          ['add', 'shard1', 'node2'],
        ],
        by_node: {
          node1: ['shard2', 'shard3', 'shard4'],
          node2: ['shard1'],
        },
        by_range: {
          shard1: ['node2'],
          shard2: ['node1'],
          shard3: ['node1'],
          shard4: ['node1'],
        },
      }
    ]);
  });

  it('should handle case when shards are already assigned to node', async () => {
    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1', 'node2'] });

    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node2'],
        ['add', 'shard4', 'node2'],
      ],
      by_node: {
        node1: ['shard1', 'shard2'],
        node2: ['shard3', 'shard4'],
      },
      by_range: {
        shard1: ['node1'],
        shard2: ['node1'],
        shard3: ['node2'],
        shard4: ['node2'],
      },
    };
    sinon.stub(utils, 'getDbMetadata').resolves(db1Metadata);
    sinon.stub(utils, 'updateDbMetadata').resolves();

    await moveShard('shard1', 'node2');

    expect(utils.updateDbMetadata.callCount).to.equal(1);
    expect(utils.updateDbMetadata.args[0]).to.deep.equal([
      'db1',
      {
        _id: 'db1',
        changelog: [
          ['add', 'shard1', 'node1'],
          ['add', 'shard2', 'node1'],
          ['add', 'shard3', 'node2'],
          ['add', 'shard4', 'node2'],
          ['remove', 'shard1', 'node1'],
          ['add', 'shard1', 'node2'],
        ],
        by_node: {
          node1: ['shard2'],
          node2: ['shard3', 'shard4', 'shard1'],
        },
        by_range: {
          shard1: ['node2'],
          shard2: ['node1'],
          shard3: ['node2'],
          shard4: ['node2'],
        },
      }
    ]);
  });

  it('should handle case when all shards are removed from a node', async () => {
    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node2'],
        ['add', 'shard4', 'node2'],
        ['remove', 'shard1', 'node1'],
        ['add', 'shard1', 'node2'],
      ],
      by_node: {
        node1: ['shard2'],
        node2: ['shard3', 'shard4', 'shard1'],
      },
      by_range: {
        shard1: ['node2'],
        shard2: ['node1'],
        shard3: ['node2'],
        shard4: ['node2'],
      },
    };

    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1', 'node2'] });
    sinon.stub(utils, 'getDbMetadata').resolves(db1Metadata);
    sinon.stub(utils, 'updateDbMetadata').resolves();

    await moveShard('shard2', 'node2');

    expect(utils.updateDbMetadata.callCount).to.equal(1);
    expect(utils.updateDbMetadata.args[0]).to.deep.equal([
      'db1',
      {
        _id: 'db1',
        changelog: [
          ['add', 'shard1', 'node1'],
          ['add', 'shard2', 'node1'],
          ['add', 'shard3', 'node2'],
          ['add', 'shard4', 'node2'],
          ['remove', 'shard1', 'node1'],
          ['add', 'shard1', 'node2'],
          ['remove', 'shard2', 'node1'],
          ['add', 'shard2', 'node2'],
        ],
        by_node: {
          node2: ['shard3', 'shard4', 'shard1', 'shard2'],
        },
        by_range: {
          shard1: ['node2'],
          shard2: ['node2'],
          shard3: ['node2'],
          shard4: ['node2'],
        },
      }
    ]);
  });

  it('should handle shard being allocated to multiple nodes', async () => {
    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
        ['add', 'shard3', 'node2'],
        ['add', 'shard3', 'node3'],
      ],
      by_node: {
        node1: ['shard1'],
        node2: ['shard2', 'shard3'],
        node3: ['shard3'],
      },
      by_range: {
        shard1: ['node1'],
        shard2: ['node2'],
        shard3: ['node2', 'node3'],
      },
    };

    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1', 'node2'] });
    sinon.stub(utils, 'getDbMetadata').resolves(db1Metadata);
    sinon.stub(utils, 'updateDbMetadata').resolves();

    await moveShard('shard3', 'node1');

    expect(utils.updateDbMetadata.callCount).to.equal(1);
    expect(utils.updateDbMetadata.args[0]).to.deep.equal([
      'db1',
      {
        _id: 'db1',
        changelog: [
          ['add', 'shard1', 'node1'],
          ['add', 'shard2', 'node1'],
          ['add', 'shard3', 'node2'],
          ['add', 'shard3', 'node3'],
          ['remove', 'shard3', 'node2'],
          ['remove', 'shard3', 'node3'],
          ['add', 'shard3', 'node1'],
        ],
        by_node: {
          node1: ['shard1', 'shard3'],
          node2: ['shard2'],
        },
        by_range: {
          shard1: ['node1'],
          shard2: ['node2'],
          shard3: ['node1'],
        },
      }
    ]);
  });

  it('should display warning if target node is unknown', async () => {
    const db1Metadata = {
      _id: 'db1',
      changelog: [
        ['add', 'shard1', 'node1'],
        ['add', 'shard2', 'node1'],
      ],
      by_node: {
        node1: ['shard1', 'shard2'],
      },
      by_range: {
        shard1: ['node1'],
        shard2: ['node1'],
      },
    };

    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1'] });
    sinon.stub(utils, 'getDbMetadata').resolves(db1Metadata);
    sinon.stub(utils, 'updateDbMetadata').resolves();
    sinon.spy(console, 'warn');

    await moveShard('shard2', 'node2');

    expect(utils.updateDbMetadata.callCount).to.equal(1);
    expect(utils.updateDbMetadata.args[0]).to.deep.equal([
      'db1',
      {
        _id: 'db1',
        changelog: [
          ['add', 'shard1', 'node1'],
          ['add', 'shard2', 'node1'],
          ['remove', 'shard2', 'node1'],
          ['add', 'shard2', 'node2'],
        ],
        by_node: {
          node1: ['shard1'],
          node2: ['shard2'],
        },
        by_range: {
          shard1: ['node1'],
          shard2: ['node2'],
        },
      }
    ]);
    expect(console.warn.args).to.deep.equal([['Node node2 is unknown.']]);
  });

  it('should throw error if getting all dbs fails', async () => {
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: [] });
    sinon.stub(utils, 'getDbs').rejects({ error: true })
    await expect(moveShard('shard2', 'node2')).to.be.rejected.and.eventually.deep.equal({ error: true });
  });

  it('should throw error if getting membership fails', async () => {
    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').rejects({ error: false });
    await expect(moveShard('shard2', 'node2')).to.be.rejected.and.eventually.deep.equal({ error: false });
  });

  it('should throw error if getting metadata fails', async () => {
    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1'] });
    sinon.stub(utils, 'getDbMetadata').rejects({ an: 'error' });
    sinon.stub(utils, 'updateDbMetadata');
    sinon.spy(console, 'warn');

    await expect(moveShard('shard2', 'node2')).to.be.rejected.and.eventually.deep.equal({ an: 'error' });
  });

  it('should throw error if updating metadata fails', async () => {
    const metadata = {
      _id: 'db1',
      changelog: [],
      by_range: { shard2: ['node2'] },
      by_node: { node2: ['shard2'] },
    }
    sinon.stub(utils, 'getDbs').resolves(['db1']);
    sinon.stub(utils, 'getMembership').resolves({ cluster_nodes: ['node1'] });
    sinon.stub(utils, 'getDbMetadata').resolves(metadata);
    sinon.stub(utils, 'updateDbMetadata').rejects({ failed: true });

    await expect(moveShard('shard2', 'node1')).to.be.rejected.and.eventually.deep.equal({ failed: true });
  });

});

