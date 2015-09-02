/*jshint node:true, mocha: true, expr:true*/
/*jscs:disable disallowQuotedKeysInObjects*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals.js');


describe('issue526', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('issue526'),
        Q = testFixture.Q,
        storage,
        projectName = 'issue526',
        projectId = testFixture.projectName2Id(projectName),
        project,
        core,
        rootNode,
        commit,
        baseRootHash,

        gmeAuth;

    function applyChange(changeObject, next) {
        core.applyTreeDiff(rootNode, changeObject.diff, function (err) {
            var persisted;
            if (err) {
                next(err);
                return;
            }
            persisted = core.persist(rootNode);
            changeObject.rootHash = core.getHash(rootNode);
            changeObject.root = rootNode;
            project.makeCommit(null,
                [commit],
                changeObject.rootHash,
                persisted.objects,
                'apply change finished ' + new Date().getTime(),
                function (err, commitResult) {
                    if (err) {
                        next(err);
                        return;
                    }
                    changeObject.commitHash = commitResult.hash;
                    //we restore the root object
                    core.loadRoot(baseRootHash, function (err, r) {
                        if (err) {
                            next(err);
                            return;
                        }
                        rootNode = r;
                        next(null);
                    });
                });
        });
    }

    before(function (done) {
        gmeConfig.storage.cache = 1;
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: 'test/common/core/corediff/base002.json',
                    projectName: projectName,
                    branchName: 'base',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function (result) {
                project = result.project;
                core = result.core;
                rootNode = result.rootNode;
                commit = result.commitHash;
                baseRootHash = result.rootHash;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    it('changing and moving the node parallel [same as corediff.spec.merge]', function (done) {
        var changeA = {},
            changeB = {};
        changeA.diff = {
            '579542227': {
                '651215756': {
                    'attr': {
                        'priority': 2
                    },
                    'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                },
                'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
            },
            'attr': {
                'changeA': true
            },
            'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
        };
        changeB.diff = {
            '1786679144': {
                '651215756': {
                    'movedFrom': '/579542227/651215756',
                    'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                },
                guid: '8b636e17-3e94-e0c6-2678-1a24ee5e6ae7',
            },
            'attr': {
                'changeB': true
            },
            'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
        };
        applyChange(changeA, function (err) {
            if (err) {
                done(err);
                return;
            }
            core.getAttribute(changeA.root, 'changeA').should.be.true;
            (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
            (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
            applyChange(changeB, function (err) {
                var params;
                if (err) {
                    done(err);
                    return;
                }
                params = {
                    projectId: projectId,
                    commitA: changeA.commitHash,
                    commitB: changeB.commitHash
                };
                core.getAttribute(changeB.root, 'changeB').should.be.true;
                (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
                (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
                storage.getCommonAncestorCommit(params, function (err, hash) {
                    if (err) {
                        done(err);
                        return;
                    }
                    (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
                    (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
                    hash.should.be.equal(commit);

                    //generate diffs
                    core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                        (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
                        (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
                        if (err) {
                            done(err);
                            return;
                        }
                        diff[579542227][651215756].attr.priority.should.be.equal(2);
                        changeA.computedDiff = diff;
                        core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                            if (err) {
                                done(err);
                                return;
                            }
                            diff[1786679144][651215756].movedFrom.should.be.exist;
                            changeB.computedDiff = diff;
                            var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                            conflict.items.should.be.empty;

                            //apply merged diff to base
                            var merged = {diff: conflict.merge};
                            applyChange(merged, function (err) {
                                if (err) {
                                    done(err);
                                    return;
                                }

                                //check values
                                core.loadByPath(merged.root, '/1786679144/651215756', function (err, a) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    core.getAttribute(a, 'priority').should.be.equal(2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});