/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('tree loading functions', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('coretreeloader.spec'),
        storage,
        projectName = 'treeLoaderProj',
        project,
        core,
        rootNode,
        commit,
        baseRootHash,
        gmeAuth,
        irNull;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: 'seeds/SignalFlowSystem.webgmex',
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
                return testFixture.importProject(storage, {
                    projectSeed: 'seeds/EmptyProject.webgmex',
                    projectName: 'TraverseNullNodes',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function (result) {
                irNull = result;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    beforeEach(function (done) {
        //we load the base root always
        Q.nfcall(core.loadRoot, baseRootHash)
            .then(function (root) {
                rootNode = root;
            })
            .nodeify(done);
    });

    it('should traverse with default configuration', function (done) {
        var checkArray = [];
        core.traverse(rootNode, null, function (node, next) {
            checkArray.push(core.getPath(node));
            next();
        })
            .then(function () {
                expect(checkArray).to.have.length(118);
                expect(checkArray.indexOf('/-1')).not.to.equal(-1);
                expect(checkArray.indexOf('')).not.to.equal(-1);
            })
            .nodeify(done);
    });

    it('should traverse and exclude the root', function (done) {
        var checkArray = [];
        core.traverse(rootNode, {excludeRoot: true}, function (node, next) {
            checkArray.push(core.getPath(node));
            next();
        })
            .then(function () {
                expect(checkArray).to.have.length(117);
                expect(checkArray.indexOf('/-1')).not.to.equal(-1);
                expect(checkArray.indexOf('')).to.equal(-1);
            })
            .nodeify(done);
    });

    it('should traverse with minimal settings', function (done) {
        var checkArray = [];
        core.traverse(rootNode, {maxParallelLoad: 1}, function (node, next) {
            checkArray.push(core.getPath(node));
            next();
        })
            .then(function () {
                expect(checkArray).to.have.length(118);
                expect(checkArray.indexOf('/-1')).not.to.equal(-1);
                expect(checkArray.indexOf('')).not.to.equal(-1);
            })
            .nodeify(done);
    });

    it('should stop traverse on error', function (done) {
        var checkArray = [];
        core.traverse(rootNode, null, function (node, next) {
            checkArray.push(core.getPath(node));
            next(new Error('just one node can make it'));
        })
            .then(function () {
                throw new Error('should have provide error!');
            })
            .catch(function () {
                expect(checkArray).to.have.length(1);
            })
            .nodeify(done);
    });

    it('should traverse despite of error', function (done) {
        var checkArray = [];
        core.traverse(rootNode, {stopOnError: false}, function (node, next) {
            checkArray.push(core.getPath(node));
            next(new Error('all node can make it'));
        })
            .then(function () {
                throw new Error('should have provide error!');
            })
            .catch(function () {
                expect(checkArray).to.have.length(118);
            })
            .nodeify(done);
    });

    it('should respect order of traverse', function (done) {
        var arrayBFS = [],
            arrayDFS = [];
        core.traverse(rootNode, {order: 'BFS'}, function (node, next) {
            arrayBFS.push(core.getPath(node));
            next();
        })
            .then(function () {
                expect(arrayBFS).to.have.length(118);
                return core.traverse(rootNode, {order: 'DFS'}, function (node, next) {
                    arrayDFS.push(core.getPath(node));
                    next();
                });
            })
            .then(function () {
                expect(arrayDFS).to.have.length(118);
                expect(arrayBFS[50]).not.to.equal(arrayDFS[50]);
            })
            .nodeify(done);
    });

    it('should not invoke visitFn with null nodes', function (done) {
        var cnt = 0,
            res1,
            basePath;

        function visitFn(node, next) {
            expect(node).to.not.equal(null);
            cnt += 1;
            next();
        }

        function makeCommitAndLoadNewRoot(rootNode, parentHash) {
            var persisted = irNull.core.persist(rootNode),
                newHash;

            return irNull.project.makeCommit(null, [parentHash], persisted.rootHash, persisted.objects, 'msg')
                .then(function (commitResult) {
                    newHash = commitResult.hash;
                    return irNull.core.loadRoot(persisted.rootHash);
                })
                .then(function (newRootNode) {
                    return {
                        rootNode: newRootNode,
                        commitHash: newHash
                    };
                });
        }

        irNull.core.loadByPath(irNull.rootNode, '/1')
            .then(function (fco) {
                var base = irNull.core.createNode({
                    parent: irNull.rootNode,
                    base: fco
                });

                basePath = irNull.core.getPath(base);

                irNull.core.createNode({
                    parent: irNull.rootNode,
                    base: base
                });

                cnt = 0;
                return irNull.core.traverse(irNull.rootNode, null, visitFn);
            })
            .then(function () {
                expect(cnt).to.equal(4);
                return makeCommitAndLoadNewRoot(irNull.rootNode, irNull.commitHash);
            })
            .then(function (result) {
                res1 = result;
                return irNull.core.loadByPath(res1.rootNode, basePath);
            })
            .then(function (baseNode) {
                irNull.core.deleteNode(baseNode);
                return makeCommitAndLoadNewRoot(res1.rootNode, res1.commitHash);
            })
            .then(function (result) {
                // After deletion of the base the visit should only find 2 nodes.
                cnt = 0;
                return irNull.core.traverse(result.rootNode, null, visitFn);
            })
            .then(function () {
                expect(cnt).to.equal(2);
            })
            .nodeify(done);

    });
});