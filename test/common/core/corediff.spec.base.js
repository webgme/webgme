/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('corediff-base', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('corediff-base'),
        storage,
        Q = testFixture.Q,
        expect = testFixture.expect,

        gmeAuth,

        guestAccount = gmeConfig.authentication.guestAccount;

    before(function (done) {
        var clearDB = testFixture.clearDatabase(gmeConfig),
            gmeAuthPromise;

        gmeAuthPromise = testFixture.getGMEAuth(gmeConfig)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
            });


        Q.all([clearDB, gmeAuthPromise])
            .then(function () {
                return Q.all([
                    gmeAuth.addUser(guestAccount, guestAccount + '@example.com', guestAccount, true, {overwrite: true}),
                    gmeAuth.addUser('admin', 'admin@example.com', 'admin', true, {overwrite: true, siteAdmin: true})
                ]);
            })
            .then(function () {
                return Q.all([
                    gmeAuth.authorizeByUserId(guestAccount, projectName, 'create', {
                        read: true,
                        write: true,
                        delete: true
                    })
                ]);
            })
            .then(function () {
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(done)
            .catch(done);
    });

    after(function (done) {
        storage.deleteProject({projectName: projectName})
            .then(function () {

                return Q.all([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .then(done)
            .catch(done);
    });

    describe('commitAncestor', function () {
        describe('straight line', function () {
            var project,
                projectName = 'straightLineTest',
                commitChain = [],
                chainLength = 1000; // FIXME: Do we really need 1000 commits?

            before(function (done) {
                storage.openDatabase()
                    .then(function () {
                        return storage.deleteProject({projectName: projectName});
                    })
                    .then(function () {
                        return testFixture.importProject(storage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        });
                    })
                    .then(function (importResult) {
                        //finally we create the commit chain
                        var needed = chainLength,
                            nextCommit = function (err, commitResult) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                needed -= 1;
                                commitChain.push(commitResult.hash);
                                if (needed === 0) {
                                    done();
                                } else {
                                    project.makeCommit(null,
                                        [commitResult.hash],
                                        importResult.rootHash,
                                        [], // no core-objects
                                        '_' + (chainLength - needed).toString() + '_',
                                        nextCommit);
                                }
                            };

                        project = importResult.project;
                        project.makeCommit(null,
                            [importResult.commitHash],
                            importResult.rootHash,
                            [],
                            '_' + 0 + '_',
                            nextCommit);
                    })
                    .catch(done);
            });

            after(function (done) {
                storage.deleteProject({projectName: projectName})
                    .then(function () {
                        storage.closeDatabase(done);
                    })
                    .catch(function (err) {
                        logger.error(err);
                        storage.closeDatabase(done);
                    });
            });

            it('single chain 0 vs 1', function (done) {
                project.getCommonAncestorCommit(commitChain[0], commitChain[1])
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[0]);
                        done();
                    })
                    .catch(done);
            });

            it('single chain 1 vs 0', function (done) {
                project.getCommonAncestorCommit(commitChain[1], commitChain[0])
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[0]);
                        done();
                    })
                    .catch(done);
            });

            it('single chain 1 vs 1', function (done) {
                project.getCommonAncestorCommit(commitChain[1], commitChain[1])
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[1]);
                        done();
                    })
                    .catch(done);
            });

            it('single chain 0 vs 999', function (done) {
                project.getCommonAncestorCommit(commitChain[0], commitChain[999])
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[0]);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('complex chain', function () {
            var project,
                projectName = 'complexChainTest',
                commitChain = [];
            before(function (done) {
                storage.openDatabase()
                    .then(function () {
                        return storage.deleteProject({projectName: projectName});
                    })
                    .then(function () {
                        return testFixture.importProject(storage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        });
                    })
                    .then(function (importResult) {
                        var commitDatas = [],
                            id = 0;
                        //finally we create the commit chain
                        //           o -- o           8,9
                        //          /      \
                        //         o        o         7,12
                        //        / \      /
                        //       /   o -- o           10,11
                        // o -- o -- o -- o -- o -- o 1,2,3,4,5,6
                        project = importResult.project;
                        function addCommitObject(parents) {
                            var commitObject = project.createCommitObject(parents,
                                importResult.rootHash,
                                'tester',
                                id.toString());

                            commitDatas.push({
                                projectName: 'complexChainTest',
                                commitObject: commitObject,
                                coreObjects: []
                            });

                            id += 1;
                            commitChain.push(commitObject._id);
                        }

                        addCommitObject([importResult.commitHash]);
                        addCommitObject([commitChain[0]]);
                        addCommitObject([commitChain[1]]);
                        addCommitObject([commitChain[2]]);
                        addCommitObject([commitChain[3]]);
                        addCommitObject([commitChain[4]]);
                        addCommitObject([commitChain[5]]);
                        addCommitObject([commitChain[2]]);
                        addCommitObject([commitChain[7]]);
                        addCommitObject([commitChain[8]]);
                        addCommitObject([commitChain[7]]);
                        addCommitObject([commitChain[10]]);
                        addCommitObject([commitChain[9], commitChain[11]]);

                        function makeCommit(commitData) {
                            return storage.makeCommit(commitData);
                        }

                        return Q.all(commitDatas.map(makeCommit));
                    })
                    .then(function (/*commitResults*/) {
                        done();
                    })
                    .catch(done);
            });

            after(function (done) {
                storage.deleteProject({projectName: projectName})
                    .then(function () {
                        storage.closeDatabase(done);
                    })
                    .catch(function (err) {
                        logger.error(err);
                        storage.closeDatabase(done);
                    });
            });

            it('12 vs 6 -> 2', function (done) {
                project.getCommonAncestorCommit(commitChain[12], commitChain[6], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });
            it('9 vs 11 -> 7', function (done) {
                project.getCommonAncestorCommit(commitChain[9], commitChain[11], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[7]);
                    done();
                });
            });
            it('10 vs 4 -> 2', function (done) {
                project.getCommonAncestorCommit(commitChain[10], commitChain[4], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });
            it('12 vs 8 -> 8', function (done) {
                project.getCommonAncestorCommit(commitChain[12], commitChain[8], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[8]);
                    done();
                });
            });
            it('9 vs 5 -> 2', function (done) {
                project.getCommonAncestorCommit(commitChain[9], commitChain[5], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });
        });
    });
});
