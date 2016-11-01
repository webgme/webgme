/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('StorageHelpers', function () {
    'use strict';
    var expect,
        logger,
        Q,
        storageHelpers,
        ProjectMock;

    before(function () {
        expect = testFixture.expect;
        logger = testFixture.logger.fork('StorageHelpers');
        Q = testFixture.Q;
        storageHelpers = require('../../../src/server/storage/storagehelpers');
        ProjectMock = function (commits) {
            var self = this;

            this.objects = {};

            commits.forEach(function (commit) {
                self.objects[commit._id] = commit;
            });

            this.loadObject = function (hash, callback) {
                var deferred = Q.defer(),
                    obj = self.objects[hash];

                if (obj) {
                    deferred.resolve(obj);
                } else {
                    deferred.reject(new Error('object does not exist ' + hash));
                }

                return deferred.promise.nodeify(callback);
            };
        };
    });

    it('should raise error with missing commits', function (done) {
        var commit = {_id: '#1', time: 1, parents: ['#doesNotExist']},
            project = new ProjectMock([commit]);

        storageHelpers.loadHistory(project, 10, null, [commit])
            .then(function () {
                throw new Error('should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.contain('parent does not exist: ');
            })
            .nodeify(done);
    });

    describe('loadHistory - simple chain', function () {
        var project,
            chain;
        before(function () {
            /*
             *   #3
             *   #2
             *   #1
             */
            chain = [
                {
                    _id: '#3',
                    parents: ['#2'],
                    time: 3
                },
                {
                    _id: '#2',
                    parents: ['#1'],
                    time: 2
                },
                {
                    _id: '#1',
                    parents: [''],
                    time: 1
                }
            ];
            project = new ProjectMock(chain);
        });

        it('should start from top and return chain', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from top with num=2 and return sub-chain', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 2, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[1]);
                })
                .nodeify(done);
        });

        it('should start from middle and return sub-chain', function (done) {
            var heads = [
                chain[1]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[1]);
                    expect(result[1]).to.deep.equal(chain[2]);
                })
                .nodeify(done);
        });

        it('should start from middle and top and return chain', function (done) {
            var heads = [
                chain[0],
                chain[1]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from top and top and return chain', function (done) {
            var heads = [
                chain[0],
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from top and stop at target', function (done) {
            var heads = [chain[0]];

            storageHelpers.loadHistory(project, 10, '#2', heads)
                .then(function (result) {
                    expect(result).to.have.length(2);
                    expect(result[1]._id).to.equal(chain[1]._id);
                })
                .nodeify(done);
        });

        it('should start from top and stop before target', function (done) {
            var heads = [chain[0]];

            storageHelpers.loadHistory(project, 2, '#1', heads)
                .then(function (result) {
                    expect(result).to.have.length(2);
                    expect(result[1]._id).to.equal(chain[1]._id);
                })
                .nodeify(done);
        });
    });

    describe('loadHistory - two heads w/ common ancestor', function () {
        var project,
            chain;
        before(function () {
            /*
             * #3
             *  |   #2
             *  \   /
             *   #1
             */
            chain = [
                {
                    _id: '#3',
                    parents: ['#1'],
                    time: 3
                },
                {
                    _id: '#2',
                    parents: ['#1'],
                    time: 2
                },
                {
                    _id: '#1',
                    parents: [''],
                    time: 1
                }
            ];
            project = new ProjectMock(chain);
        });

        it('should start from 3 and return 3 and 1', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[2]);
                })
                .nodeify(done);
        });

        it('should start from 2 and return 2 and 1', function (done) {
            var heads = [
                chain[1]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[1]);
                    expect(result[1]).to.deep.equal(chain[2]);
                })
                .nodeify(done);
        });

        it('should start from 3 and 2 and return chain', function (done) {
            var heads = [
                chain[1],
                chain[0],
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from 3 return everything except 2', function (done) {
            var heads = [chain[0]];

            storageHelpers.loadHistory(project, -1, '#2', heads)
                .then(function (result) {
                    expect(result).to.have.length(2);
                    expect(result[1]._id).to.equal(chain[2]._id);
                })
                .nodeify(done);
        });
    });

    describe('loadHistory - two parallel heads', function () {
        var project,
            chain;
        before(function () {
            /*
             * #3
             *  |   #2
             *  |   #1
             * #0    |
             *  |    |
             */
            chain = [
                {
                    _id: '#3',
                    parents: ['#0'],
                    time: 3
                },
                {
                    _id: '#2',
                    parents: ['#1'],
                    time: 2
                },
                {
                    _id: '#1',
                    parents: [''],
                    time: 1
                },
                {
                    _id: '#0',
                    parents: [''],
                    time: 0
                }
            ];
            project = new ProjectMock(chain);
        });

        it('should start from 3 and return 3 and 0', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[3]);
                })
                .nodeify(done);
        });

        it('should start from 3 and 2 with num=3 and return 3, 2 and 1', function (done) {
            var heads = [
                chain[0],
                chain[1]
            ];

            storageHelpers.loadHistory(project, 3, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(3);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[1]);
                    expect(result[2]).to.deep.equal(chain[2]);
                })
                .nodeify(done);
        });

        it('should start from 3 and 2 and return chain', function (done) {
            var heads = [
                chain[1],
                chain[0],
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from 3 and 2 and stop at target', function (done) {
            var heads = [chain[0],chain[1]];

            storageHelpers.loadHistory(project, -1, '#1', heads)
                .then(function (result) {
                    expect(result).to.have.length(3);
                    expect(result[2]._id).to.equal(chain[2]._id);
                })
                .nodeify(done);
        });
    });

    describe('loadHistory - two parallel heads 2', function () {
        var project,
            chain;
        before(function () {
            /*
             * #3
             * #2
             *  |   #1
             * #0    |
             *  |    |
             */
            chain = [
                {
                    _id: '#3',
                    parents: ['#2'],
                    time: 3
                },
                {
                    _id: '#2',
                    parents: ['#0'],
                    time: 2
                },
                {
                    _id: '#1',
                    parents: [''],
                    time: 1
                },
                {
                    _id: '#0',
                    parents: [''],
                    time: 0
                }
            ];
            project = new ProjectMock(chain);
        });

        it('should start from 3 and return 3, 2 and 0', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(3);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[1]);
                    expect(result[2]).to.deep.equal(chain[3]);
                })
                .nodeify(done);
        });

        it('should start from 3 and 1 with num=2 and return 3, 2', function (done) {
            var heads = [
                chain[0],
                chain[2]
            ];

            storageHelpers.loadHistory(project, 2, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[1]);
                })
                .nodeify(done);
        });
    });

    describe('loadHistory - merged history 1', function () {
        var project,
            chain;
        before(function () {
            /*
             *    #3
             *   /  \
             *  |   #2
             * #1    |
             *   \  /
             *    #0
             */
            chain = [
                {
                    _id: '#3',
                    parents: ['#1', '#2'],
                    time: 3
                },
                {
                    _id: '#2',
                    parents: ['#0'],
                    time: 2
                },
                {
                    _id: '#1',
                    parents: ['#0'],
                    time: 1
                },
                {
                    _id: '#0',
                    parents: [''],
                    time: 0
                }
            ];

            project = new ProjectMock(chain);
        });

        it('should start from 3 and return chain', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from 3 and 2 and return chain', function (done) {
            var heads = [
                chain[0],
                chain[1]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from 3 and 1 with num=2 and return 3, 2', function (done) {
            var heads = [
                chain[0],
                chain[2]
            ];

            storageHelpers.loadHistory(project, 2, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[1]);
                })
                .nodeify(done);
        });

        it('should start from 3 and 2 with num=3 and return 3, 2, 1', function (done) {
            var heads = [
                chain[0],
                chain[1]
            ];

            storageHelpers.loadHistory(project, 3, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(3);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[1]);
                    expect(result[2]).to.deep.equal(chain[2]);
                })
                .nodeify(done);
        });

        it('should start from 3 and stop at 1', function (done) {
            var heads = [chain[0]];

            storageHelpers.loadHistory(project, -1, '#1', heads)
                .then(function (result) {
                    expect(result).to.have.length(3);
                    expect(result[2]._id).to.equal(chain[2]._id);
                })
                .nodeify(done);
        });

        it('should start from 3 and stop at 2', function (done) {
            var heads = [chain[0]];

            storageHelpers.loadHistory(project, -1, '#2', heads)
                .then(function (result) {
                    expect(result).to.have.length(2);
                    expect(result[1]._id).to.equal(chain[1]._id);
                })
                .nodeify(done);
        });
    });

    describe('loadHistory - merged history 2', function () {
        var project,
            chain;
        before(function () {
            /*
             * #11
             *  |  #10
             *  #9  |
             *  #8  |
             *   \  /
             *    #7
             *    #6
             *   /  \
             *  #5   |
             *  #4   |
             *  #3   |
             *  |    |
             *  |   #2
             * #1    |
             *   \  /
             *    #0
             */
            chain = [
                {
                    _id: '#11',
                    parents: ['#9'],
                    time: 11
                },
                {
                    _id: '#10',
                    parents: ['#7'],
                    time: 10
                },
                {
                    _id: '#9',
                    parents: ['#8'],
                    time: 9
                },
                {
                    _id: '#8',
                    parents: ['#7'],
                    time: 8
                },
                {
                    _id: '#7',
                    parents: ['#6'],
                    time: 7
                },
                {
                    _id: '#6',
                    parents: ['#5', '#2'],
                    time: 6
                },
                {
                    _id: '#5',
                    parents: ['#4'],
                    time: 5
                },
                {
                    _id: '#4',
                    parents: ['#3'],
                    time: 4
                },
                {
                    _id: '#3',
                    parents: ['#1'],
                    time: 3
                },
                {
                    _id: '#2',
                    parents: ['#0'],
                    time: 2
                },
                {
                    _id: '#1',
                    parents: ['#0'],
                    time: 1
                },
                {
                    _id: '#0',
                    parents: [''],
                    time: 0
                }
            ];

            project = new ProjectMock(chain);
        });

        it('should start from 11 and 10 and return chain', function (done) {
            var heads = [
                chain[0],
                chain[1]
            ];

            storageHelpers.loadHistory(project, 100, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from 11 and return all but 10', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 100, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(11);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[2]);
                    expect(result[2]).to.deep.equal(chain[3]);
                    expect(result[3]).to.deep.equal(chain[4]);
                    expect(result[4]).to.deep.equal(chain[5]);
                    expect(result[5]).to.deep.equal(chain[6]);
                    expect(result[6]).to.deep.equal(chain[7]);
                    expect(result[7]).to.deep.equal(chain[8]);
                    expect(result[8]).to.deep.equal(chain[9]);
                    expect(result[9]).to.deep.equal(chain[10]);
                    expect(result[10]).to.deep.equal(chain[11]);
                })
                .nodeify(done);
        });

        it('should start from 11 and stop at 2', function (done) {
            var heads = [chain[0]];

            storageHelpers.loadHistory(project, -1, '#2', heads)
                .then(function (result) {
                    expect(result).to.have.length(9);
                    expect(result[8]._id).to.equal(chain[9]._id);
                })
                .nodeify(done);
        });
    });

    describe('loadHistory - simple chain commit time not in order', function () {
        var project,
            chain;
        before(function () {
            /*
             *   #3
             *   #2 (1)
             *   #1 (2)
             */
            chain = [
                {
                    _id: '#3',
                    parents: ['#2'],
                    time: 3
                },
                {
                    _id: '#2',
                    parents: ['#1'],
                    time: 1
                },
                {
                    _id: '#1',
                    parents: [''],
                    time: 2
                }
            ];
            project = new ProjectMock(chain);
        });

        it('should start from top and return chain', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from top with num=2 and return sub-chain', function (done) {
            var heads = [
                chain[0]
            ];

            storageHelpers.loadHistory(project, 2, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[0]);
                    expect(result[1]).to.deep.equal(chain[1]);
                })
                .nodeify(done);
        });

        it('should start from middle and return sub-chain', function (done) {
            var heads = [
                chain[1]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result.length).to.equal(2);
                    expect(result[0]).to.deep.equal(chain[1]);
                    expect(result[1]).to.deep.equal(chain[2]);
                })
                .nodeify(done);
        });

        it('should start from middle and top and return chain', function (done) {
            var heads = [
                chain[0],
                chain[1]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });

        it('should start from top and top and return chain', function (done) {
            var heads = [
                chain[0],
                chain[0]
            ];

            storageHelpers.loadHistory(project, 10, null, heads)
                .then(function (result) {
                    expect(result).to.deep.equal(chain);
                })
                .nodeify(done);
        });
    });
});