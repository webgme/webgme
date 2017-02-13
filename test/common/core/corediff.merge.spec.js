/*jshint node:true, mocha: true, expr:true*/
/*jscs:disable disallowQuotedKeysInObjects*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');


describe('corediff-merge', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('corediff.spec.merge'),
        expect = testFixture.expect,
        __should = testFixture.should,
        Q = testFixture.Q,
        storage,
        gmeAuth,
        applyChange = function (params, next) {
            params.core.applyTreeDiff(params.rootNode, params.changeObject.diff)
                .then(function () {
                    var persisted = params.core.persist(params.rootNode);
                    params.changeObject.rootHash = params.core.getHash(params.rootNode);
                    params.changeObject.root = params.rootNode;
                    return params.project.makeCommit('master',
                        [params.commit],
                        params.changeObject.rootHash,
                        persisted.objects,
                        'apply change finished ' + new Date().getTime()
                    );
                })
                .then(function (commitResult) {
                    params.changeObject.commitHash = commitResult.hash;
                    return params.core.loadRoot(params.baseRootHash);
                })
                .then(function (r) {
                    params.rootNode = r;
                })
                .nodeify(next);
        };


    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig/*, projectName*/)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
            })
            .then(function () {
                return storage.openDatabase();
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allSettled([
                gmeAuth.unload(),
                storage.closeDatabase()
            ])
            .nodeify(done);
    });


    describe('basic', function () {
        var projectName = 'corediffMergeTesting',
            projectId = testFixture.projectName2Id(projectName),
            project,
            core,
            rootNode,
            commit,
            baseRootHash;

        before(function (done) {
            storage.openDatabase()
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'test/common/core/corediff/base002.webgmex',
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
                .then(done)
                .catch(done);
        });

        beforeEach(function (done) {
            //load the base state and sets the
            core.loadRoot(baseRootHash)
                .then(function (r) {
                    rootNode = r;
                })
                .nodeify(done);
        });

        describe('attribute', function () {

            it('initial value check', function (done) {
                Q.allDone([
                        core.loadByPath(rootNode, '/579542227/651215756'),
                        core.loadByPath(rootNode, '/579542227/2088994530')

                    ])
                    .then(function (nodes) {
                        core.getAttribute(nodes[0], 'priority').should.be.equal(100);
                        core.getAttribute(nodes[1], 'priority').should.be.equal(100);
                    })
                    .nodeify(done);
            });

            it('changing separate attributes', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

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
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '2088994530': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': '32e4adfc-deac-43ae-2504-3563b9d58b97'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //restore the value of rootNode
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].attr.priority).to.equal(2);
                        expect(diffs[1][579542227][2088994530].attr.priority).to.equal(2);

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(0);
                        change.diff = change.conflict.merge;

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return Q.allDone([
                            core.loadByPath(change.root, '/579542227/651215756'),
                            core.loadByPath(change.root, '/579542227/2088994530')
                        ]);
                    })
                    .then(function (nodes) {
                        expect(core.getAttribute(nodes[0], 'priority')).to.equal(2);
                        expect(core.getAttribute(nodes[1], 'priority')).to.equal(2);
                    })
                    .nodeify(done);
            });

            it('changing to the same value', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

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
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //restore the value of rootNode
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].attr.priority).to.equal(2);
                        expect(diffs[1][579542227][651215756].attr.priority).to.equal(2);

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(0);
                        change.diff = change.conflict.merge;

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return core.loadByPath(change.root, '/579542227/651215756');
                    })
                    .then(function (node) {
                        expect(core.getAttribute(node, 'priority')).to.equal(2);
                    })
                    .nodeify(done);
            });

            it('changing to different values', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

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
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 3
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //restore the value of rootNode
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].attr.priority).to.equal(2);
                        expect(diffs[1][579542227][651215756].attr.priority).to.equal(3);

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(1);
                        change.conflict.items[0].selected = 'theirs';

                        change.diff = core.applyResolution(change.conflict);

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return core.loadByPath(change.root, '/579542227/651215756');
                    })
                    .then(function (node) {
                        expect(core.getAttribute(node, 'priority')).to.equal(3);
                    })
                    .nodeify(done);
            });

            it('changing and moving the node parallel', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

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

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        rootNode = applyParams.rootNode;

                        expect(core.getAttribute(changeA.root, 'changeA')).to.equal(true);
                        expect(core.getAttribute(rootNode, 'changeA')).to.equal(undefined);
                        expect(core.getAttribute(rootNode, 'changeB')).to.equal(undefined);

                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        rootNode = applyParams.rootNode;

                        expect(core.getAttribute(changeB.root, 'changeB')).to.equal(true);
                        expect(core.getAttribute(rootNode, 'changeA')).to.equal(undefined);
                        expect(core.getAttribute(rootNode, 'changeB')).to.equal(undefined);

                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].attr.priority).to.equal(2);
                        expect(typeof diffs[1][1786679144][651215756].movedFrom).to.equal('string');

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(0);

                        change.diff = core.applyResolution(change.conflict);

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return core.loadByPath(change.root, '/1786679144/651215756');
                    })
                    .then(function (node) {
                        expect(core.getAttribute(node, 'priority')).to.equal(2);
                    })
                    .nodeify(done);
            });
        });

        describe('registry', function () {
            it('initial value check', function (done) {
                Q.allDone([
                        core.loadByPath(rootNode, '/579542227/651215756'),
                        core.loadByPath(rootNode, '/579542227/2088994530')
                    ])
                    .then(function (nodes) {
                        expect(core.getRegistry(nodes[0], 'position')).to.eql({x: 69, y: 276});
                        expect(core.getRegistry(nodes[1], 'position')).to.eql({x: 243, y: 184});
                    })
                    .nodeify(done);
            });

            it('changing separate nodes', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '2088994530': {
                            'reg': {
                                'position': {'x': 300, 'y': 300}
                            },
                            'guid': '32e4adfc-deac-43ae-2504-3563b9d58b97'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //restore the value of rootNode
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].reg.position).to.eql({x: 200, y: 200});
                        expect(diffs[1][579542227][2088994530].reg.position).to.eql({x: 300, y: 300});

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(0);

                        change.diff = change.conflict.merge;

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return Q.allDone([
                            core.loadByPath(change.root, '/579542227/651215756'),
                            core.loadByPath(change.root, '/579542227/2088994530')
                        ]);
                    })
                    .then(function (nodes) {
                        expect(core.getRegistry(nodes[0], 'position')).to.eql({x: 200, y: 200});
                        expect(core.getRegistry(nodes[1], 'position')).to.eql({x: 300, y: 300});
                    })
                    .nodeify(done);
            });

            it('changing to the same value', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //restore the value of rootNode
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].reg.position).to.eql({x: 200, y: 200});
                        expect(diffs[1][579542227][651215756].reg.position).to.eql({x: 200, y: 200});

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(0);
                        change.diff = change.conflict.merge;

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return core.loadByPath(change.root, '/579542227/651215756');
                    })
                    .then(function (node) {
                        expect(core.getRegistry(node, 'position')).to.eql({x: 200, y: 200});
                    })
                    .nodeify(done);
            });

            it('changing to different values', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 300, 'y': 300}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //restore the value of rootNode
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].reg.position).to.eql({x: 200, y: 200});
                        expect(diffs[1][579542227][651215756].reg.position).to.eql({x: 300, y: 300});

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(1);
                        change.conflict.items[0].selected = 'theirs';

                        change.diff = core.applyResolution(change.conflict);

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return core.loadByPath(change.root, '/579542227/651215756');
                    })
                    .then(function (node) {
                        expect(core.getRegistry(node, 'position')).to.eql({x: 300, y: 300});
                    })
                    .nodeify(done);
            });

            it('changing and moving the node parallel', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
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
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //reset rootNode value
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].reg.position).to.eql({x: 200, y: 200});
                        expect(typeof diffs[1][1786679144][651215756].movedFrom).to.equal('string');

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(0);

                        change.diff = core.applyResolution(change.conflict);

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        return core.loadByPath(change.root, '/1786679144/651215756');
                    })
                    .then(function (node) {
                        expect(core.getRegistry(node, 'position')).to.eql({x: 200, y: 200});
                    })
                    .nodeify(done);
            });
        });

        describe('issue', function () {

            it('526 - moving and changeing the same node', function (done) {
                var changeA = {},
                    changeB = {},
                    change = {},
                    applyParams = {
                        core: core,
                        rootNode: rootNode,
                        project: project,
                        commit: commit,
                        baseRootHash: baseRootHash
                    };

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

                applyParams.changeObject = changeA;
                Q.nfcall(applyChange, applyParams)
                    .then(function () {
                        expect(core.getAttribute(changeA.root, 'changeA')).to.equal(true);
                        expect(core.getAttribute(applyParams.rootNode, 'changeA')).to.equal(undefined);
                        expect(core.getAttribute(applyParams.rootNode, 'changeB')).to.equal(undefined);
                        applyParams.changeObject = changeB;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        expect(core.getAttribute(changeB.root, 'changeB')).to.equal(true);
                        expect(core.getAttribute(applyParams.rootNode, 'changeA')).to.equal(undefined);
                        expect(core.getAttribute(applyParams.rootNode, 'changeB')).to.equal(undefined);
                        return storage.getCommonAncestorCommit({
                            projectId: projectId,
                            commitA: changeA.commitHash,
                            commitB: changeB.commitHash
                        });
                    })
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commit);

                        //restore the value of rootNode
                        rootNode = applyParams.rootNode;

                        return Q.allDone([
                            core.generateTreeDiff(rootNode, changeA.root),
                            core.generateTreeDiff(rootNode, changeB.root)
                        ]);
                    })
                    .then(function (diffs) {
                        expect(diffs[0][579542227][651215756].attr.priority).to.equal(2);
                        expect(diffs[1][1786679144][651215756].movedFrom).to.equal('/579542227/651215756');

                        changeA.computedDiff = diffs[0];
                        changeB.computedDiff = diffs[1];

                        change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                        expect(change.conflict.items).to.have.length(0);

                        change.diff = change.conflict.merge;

                        applyParams.changeObject = change;
                        return Q.nfcall(applyChange, applyParams);
                    })
                    .then(function () {
                        expect(core.getAttribute(change.root, 'changeA')).to.equal(true);
                        expect(core.getAttribute(change.root, 'changeB')).to.equal(true);

                        return core.loadByPath(change.root, '/1786679144/651215756');
                    })
                    .then(function (node) {
                        expect(core.getAttribute(node, 'priority')).to.equal(2);
                        expect(core.getChildrenRelids(core.getParent(node))).to.have.length(1);
                    })
                    .nodeify(done);
            });
        });
    });

    describe('collision', function () {
        var projectName = 'corediffMergeCollisionTests',
            projectId = testFixture.projectName2Id(projectName),
            project,
            core,
            rootNode,
            commit,
            baseRootHash;

        before(function (done) {
            testFixture.importProject(storage, {
                    projectSeed: 'test/common/core/corediff/base003.webgmex',
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger
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

        beforeEach(function (done) {
            //load the base state and sets the
            core.loadRoot(baseRootHash)
                .then(function (r) {
                    rootNode = r;
                })
                .nodeify(done);
        });

        it('should be able to merge if two nodes are moved to the same place', function (done) {
            var changeA = {},
                changeB = {},
                change = {},
                applyParams = {
                    core: core,
                    rootNode: rootNode,
                    project: project,
                    commit: commit,
                    baseRootHash: baseRootHash
                };

            changeA.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "reg": {
                            "position": {
                                "x": 83,
                                "y": 80
                            }
                        },
                        "guid": "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c",
                        "oGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "movedFrom": "/t/S",
                        "ooGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "childrenListChanged": true,
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "S": {
                        "guid": "c1125c26-2210-3d47-7f32-45891935b00d",
                        "oGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };
            changeB.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "attr": {
                            "name": "element-"
                        },
                        "reg": {
                            "position": {
                                "x": 166,
                                "y": 98
                            }
                        },
                        "guid": "c1125c26-2210-3d47-7f32-45891935b00d",
                        "oGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "movedFrom": "/Y/S",
                        "ooGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "childrenListChanged": true,
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "S": {
                        "guid": "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c",
                        "oGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };

            applyParams.changeObject = changeA;
            Q.nfcall(applyChange, applyParams)
                .then(function () {
                    applyParams.changeObject = changeB;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return storage.getCommonAncestorCommit({
                        projectId: projectId,
                        commitA: changeA.commitHash,
                        commitB: changeB.commitHash
                    });
                })
                .then(function (commonHash) {

                    expect(commonHash).to.equal(commit);

                    //reset rootNode value
                    rootNode = applyParams.rootNode;

                    return Q.allSettled([
                        core.generateTreeDiff(rootNode, changeA.root),
                        core.generateTreeDiff(rootNode, changeB.root)
                    ]);
                })
                .then(function (results) {
                    expect(results[0].value.K.S.guid).to.equal('716ffaf5-bb29-5ea5-56db-afbaf03f1e0c');
                    expect(results[1].value.K.S.guid).to.equal('c1125c26-2210-3d47-7f32-45891935b00d');

                    changeA.computedDiff = results[0].value;
                    changeB.computedDiff = results[1].value;

                    change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                    expect(change.conflict.items).to.have.length(0);

                    change.diff = change.conflict.merge;

                    expect(Object.keys(change.diff.K)).to.have.length(5);
                    expect(change.diff.K).to.include.keys('oGuids', 'guid', 'S', 'childrenListChanged');

                    applyParams.changeObject = change;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return core.loadByPath(change.root, '/K');
                })
                .then(function (container) {
                    expect(core.getChildrenPaths(container)).to.have.length(2);

                    return core.loadChildren(container);
                })
                .then(function (children) {
                    expect(['716ffaf5-bb29-5ea5-56db-afbaf03f1e0c',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[0]));
                    expect(['716ffaf5-bb29-5ea5-56db-afbaf03f1e0c',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[1]));
                    expect(core.getGuid(children[0])).not.to.equal(core.getGuid(children[1]));
                })
                .nodeify(done);
        });

        it('should be able to find the conflict of removing source node even with collision', function (done) {
            var changeA = {},
                changeB = {},
                change = {},
                applyParams = {
                    core: core,
                    rootNode: rootNode,
                    project: project,
                    commit: commit,
                    baseRootHash: baseRootHash
                };

            changeA.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "reg": {
                            "position": {
                                "x": 199,
                                "y": 109
                            }
                        },
                        "guid": "c1125c26-2210-3d47-7f32-45891935b00d",
                        "oGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "movedFrom": "/Y/S",
                        "ooGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "childrenListChanged": true,
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "S": {
                        "guid": "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c",
                        "oGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };
            changeB.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "attr": {
                            "name": "element-"
                        },
                        "reg": {
                            "position": {
                                "x": 100,
                                "y": 190
                            }
                        },
                        "guid": "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c",
                        "oGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "movedFrom": "/t/S",
                        "ooGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "childrenListChanged": true,
                    "S": {
                        "guid": "c1125c26-2210-3d47-7f32-45891935b00d",
                        "removed": true
                    },
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "childrenListChanged": true,
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };

            applyParams.changeObject = changeA;
            Q.nfcall(applyChange, applyParams)
                .then(function () {
                    applyParams.changeObject = changeB;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return storage.getCommonAncestorCommit({
                        projectId: projectId,
                        commitA: changeA.commitHash,
                        commitB: changeB.commitHash
                    });
                })
                .then(function (commonHash) {

                    expect(commonHash).to.equal(commit);

                    //reset rootNode value
                    rootNode = applyParams.rootNode;

                    return Q.allSettled([
                        core.generateTreeDiff(rootNode, changeA.root),
                        core.generateTreeDiff(rootNode, changeB.root)
                    ]);
                })
                .then(function (results) {
                    expect(results[1].value.K.S.guid).to.equal('716ffaf5-bb29-5ea5-56db-afbaf03f1e0c');
                    expect(results[0].value.K.S.guid).to.equal('c1125c26-2210-3d47-7f32-45891935b00d');

                    changeA.computedDiff = results[0].value;
                    changeB.computedDiff = results[1].value;

                    change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                    expect(change.conflict.items).to.have.length(2);

                    expect(change.conflict.items[0].theirs.path).to.equal('/K/S/removed');
                    expect(change.conflict.items[1].theirs.path).to.equal('/K/S/removed');
                    change.diff = core.applyResolution(change.conflict);

                    applyParams.changeObject = change;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return core.loadByPath(change.root, '/K');
                })
                .then(function (container) {
                    expect(core.getChildrenPaths(container)).to.have.length(2);

                    return core.loadChildren(container);
                })
                .then(function (children) {
                    expect(['716ffaf5-bb29-5ea5-56db-afbaf03f1e0c',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[0]));
                    expect(['716ffaf5-bb29-5ea5-56db-afbaf03f1e0c',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[1]));
                    expect(core.getGuid(children[0])).not.to.equal(core.getGuid(children[1]));
                })
                .nodeify(done);
        });

        it('should be able to move and create a node to the same place', function (done) {
            var changeA = {},
                changeB = {},
                change = {},
                applyParams = {
                    core: core,
                    rootNode: rootNode,
                    project: project,
                    commit: commit,
                    baseRootHash: baseRootHash
                };

            changeA.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "reg": {
                            "position": {
                                "x": 199,
                                "y": 109
                            }
                        },
                        "guid": "c1125c26-2210-3d47-7f32-45891935b00d",
                        "oGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "movedFrom": "/Y/S",
                        "ooGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "childrenListChanged": true,
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "S": {
                        "guid": "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c",
                        "oGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };
            changeB.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "removed": false,
                        "hash": '#1e6c2d0a36e16e6f1104f3394cde75f97abb0088',
                        "guid": "2d26ad75-9e5c-826e-4a3f-7453656bd518",
                        "pointer": {"base": "/1"}
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };

            applyParams.changeObject = changeA;
            Q.nfcall(applyChange, applyParams)
                .then(function () {
                    applyParams.changeObject = changeB;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return storage.getCommonAncestorCommit({
                        projectId: projectId,
                        commitA: changeA.commitHash,
                        commitB: changeB.commitHash
                    });
                })
                .then(function (commonHash) {

                    expect(commonHash).to.equal(commit);

                    //reset rootNode value
                    rootNode = applyParams.rootNode;

                    return Q.allSettled([
                        core.generateTreeDiff(rootNode, changeA.root),
                        core.generateTreeDiff(rootNode, changeB.root)
                    ]);
                })
                .then(function (results) {
                    expect(results[1].value.K.S.guid).to.equal('2d26ad75-9e5c-826e-4a3f-7453656bd518');
                    expect(results[0].value.K.S.guid).to.equal('c1125c26-2210-3d47-7f32-45891935b00d');

                    changeA.computedDiff = results[0].value;
                    changeB.computedDiff = results[1].value;

                    change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                    expect(change.conflict.items).to.have.length(0);

                    change.diff = change.conflict.merge;

                    applyParams.changeObject = change;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return core.loadByPath(change.root, '/K');
                })
                .then(function (container) {
                    expect(core.getChildrenPaths(container)).to.have.length(2);

                    return core.loadChildren(container);
                })
                .then(function (children) {
                    expect(['2d26ad75-9e5c-826e-4a3f-7453656bd518',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[0]));
                    expect(['2d26ad75-9e5c-826e-4a3f-7453656bd518',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[1]));
                    expect(core.getGuid(children[0])).not.to.equal(core.getGuid(children[1]));
                })
                .nodeify(done);
        });

        it('should be able to create and move a node to the same place', function (done) {
            var changeA = {},
                changeB = {},
                change = {},
                applyParams = {
                    core: core,
                    rootNode: rootNode,
                    project: project,
                    commit: commit,
                    baseRootHash: baseRootHash
                };

            changeB.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "reg": {
                            "position": {
                                "x": 199,
                                "y": 109
                            }
                        },
                        "guid": "c1125c26-2210-3d47-7f32-45891935b00d",
                        "oGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        },
                        "movedFrom": "/Y/S",
                        "ooGuids": {
                            "c1125c26-2210-3d47-7f32-45891935b00d": true,
                            "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "childrenListChanged": true,
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "S": {
                        "guid": "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c",
                        "oGuids": {
                            "716ffaf5-bb29-5ea5-56db-afbaf03f1e0c": true,
                            "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                            "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                        }
                    },
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };
            changeA.diff = {
                "K": {
                    "childrenListChanged": true,
                    "S": {
                        "removed": false,
                        "hash": '#1e6c2d0a36e16e6f1104f3394cde75f97abb0088',
                        "guid": "2d26ad75-9e5c-826e-4a3f-7453656bd518",
                        "pointer": {"base": "/1"}
                    },
                    "guid": "a8ca3118-83ee-b06b-b520-6ff625499600",
                    "oGuids": {
                        "a8ca3118-83ee-b06b-b520-6ff625499600": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "Y": {
                    "guid": "58fec04b-3fa2-0f42-802d-5e2c5917f315",
                    "oGuids": {
                        "58fec04b-3fa2-0f42-802d-5e2c5917f315": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "t": {
                    "guid": "21836698-a69b-6ca0-a9c4-b41fb01d5d14",
                    "oGuids": {
                        "21836698-a69b-6ca0-a9c4-b41fb01d5d14": true,
                        "03d36072-9e09-7866-cb4e-d0a36ff825f6": true,
                        "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
                    }
                },
                "guid": "03d36072-9e09-7866-cb4e-d0a36ff825f6",
                "oGuids": {
                    "03d36072-9e09-7866-cb4e-d0a36ff825f6": true
                }
            };

            applyParams.changeObject = changeA;
            Q.nfcall(applyChange, applyParams)
                .then(function () {
                    applyParams.changeObject = changeB;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return storage.getCommonAncestorCommit({
                        projectId: projectId,
                        commitA: changeA.commitHash,
                        commitB: changeB.commitHash
                    });
                })
                .then(function (commonHash) {

                    expect(commonHash).to.equal(commit);

                    //reset rootNode value
                    rootNode = applyParams.rootNode;

                    return Q.allSettled([
                        core.generateTreeDiff(rootNode, changeA.root),
                        core.generateTreeDiff(rootNode, changeB.root)
                    ]);
                })
                .then(function (results) {
                    expect(results[0].value.K.S.guid).to.equal('2d26ad75-9e5c-826e-4a3f-7453656bd518');
                    expect(results[1].value.K.S.guid).to.equal('c1125c26-2210-3d47-7f32-45891935b00d');

                    changeA.computedDiff = results[0].value;
                    changeB.computedDiff = results[1].value;

                    change.conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                    expect(change.conflict.items).to.have.length(0);

                    change.diff = core.applyResolution(change.conflict);

                    applyParams.changeObject = change;
                    return Q.nfcall(applyChange, applyParams);
                })
                .then(function () {
                    return core.loadByPath(change.root, '/K');
                })
                .then(function (container) {
                    expect(core.getChildrenPaths(container)).to.have.length(2);

                    return core.loadChildren(container);
                })
                .then(function (children) {
                    expect(['2d26ad75-9e5c-826e-4a3f-7453656bd518',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[0]));
                    expect(['2d26ad75-9e5c-826e-4a3f-7453656bd518',
                        'c1125c26-2210-3d47-7f32-45891935b00d']).to.include(core.getGuid(children[1]));
                    expect(core.getGuid(children[0])).not.to.equal(core.getGuid(children[1]));
                })
                .nodeify(done);
        });
    });
});
//TODO pointer tests should be reintroduced