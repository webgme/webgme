/*jshint node: true, mocha: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe.skip('corediff scenarios', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        projectName = 'coreDiffScenarios',
    //projectId = testFixture.projectName2Id(projectName),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('corediff.scenarios'),
        context,
        core,
        storage,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    projectSeed: 'seeds/EmptyProject.webgmex'
                });
            })
            .then(function (result) {
                context = result;
                core = context.core;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    function loadRootAndFCO(rootHash, paths) {
        var result = {
            root: null,
            fco: null
        };

        paths = paths || [];

        return core.loadRoot(rootHash)
            .then(function (root) {
                result.root = root;
                return core.loadByPath(root, '/1');
            })
            .then(function (fco) {
                result.fco = fco;
                return Q.all(paths.map(function (path) {
                    return core.loadByPath(result.root, path);
                }));
            })
            .then(function (nodes) {
                var i;
                for (i = 0; i < nodes.length; i += 1) {
                    result[paths[i]] = nodes[i];
                }

                return result;
            });
    }

    function save(rootNode) {
        var persisted = core.persist(rootNode);
        return context.project.makeCommit(null,
            [context.commitHash],
            persisted.rootHash,
            persisted.objects,
            'some message')
            .then(function () {
                return persisted.rootHash;
            });
    }

    function logNodes(nodes) {
        nodes.forEach(function (node) {
            console.log(core.getPath(node), 'base' ,core.getBase(node) ? core.getPath(core.getBase(node)) : null);
        });
    }

    // Children creation
    it('should assign a new relid when child created in both trees', function (done) {
        var originRoot,
            basePath,
            instancePath;

        loadRootAndFCO(context.rootHash)
            .then(function (r) {
                var base = core.createNode({
                        parent: r.root,
                        base: r.fco
                    }),
                    instance = core.createNode({
                        parent: r.root,
                        base: base
                    });

                basePath = core.getPath(base);
                instancePath = core.getPath(instance);

                originRoot = r.root;
                return save(r.root);
            })
            .then(function (rootHash) {
                return Q.all([
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                ]);
            })
            .then(function (trees) {
                // We've loaded two trees from the same rootHash
                // now let's make changes.

                core.createNode({
                    parent: trees[0][basePath],
                    base: trees[0].fco,
                    relid: 'conflictRelid'
                });

                core.createNode({
                    parent: trees[1][basePath],
                    base: trees[1].fco,
                    relid: 'conflictRelid'
                });


                // Save to ensure the added nodes are persisted.
                return Q.all([
                    save(trees[0].root),
                    save(trees[1].root)
                ])
                    .then(function () {
                        return Q.all([
                            core.generateTreeDiff(originRoot, trees[0].root),
                            core.generateTreeDiff(originRoot, trees[1].root),
                        ]);
                    });
            })
            .then(function (diffs) {
                var concatChanges = core.tryToConcatChanges(diffs[0], diffs[1]);

                expect(concatChanges.items.length).to.equal(0); // No conflicts detected

                return core.applyTreeDiff(originRoot, concatChanges.merge);
            })
            .then(function () {
                return core.loadSubTree(originRoot);
            })
            .then(function (st) {
                // Root, fco, base, instance, 2 children
                expect(st.length).to.equal(6);
            })
            .nodeify(done);
    });

    it('should assign a new relid when child created in one base and one instance', function (done) {
        var originRoot,
            basePath,
            instancePath;

        loadRootAndFCO(context.rootHash)
            .then(function (r) {
                var base = core.createNode({
                        parent: r.root,
                        base: r.fco
                    }),
                    instance = core.createNode({
                        parent: r.root,
                        base: base
                    });

                basePath = core.getPath(base);
                instancePath = core.getPath(instance);

                originRoot = r.root;
                return save(r.root);
            })
            .then(function (rootHash) {
                return Q.all([
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                ]);
            })
            .then(function (trees) {
                // We've loaded two trees from the same rootHash
                // now let's make changes.

                core.createNode({
                    parent: trees[0][basePath],
                    base: trees[0].fco,
                    relid: 'conflictRelid'
                });

                core.createNode({
                    parent: trees[1][instancePath],
                    base: trees[1].fco,
                    relid: 'conflictRelid'
                });


                // Save to ensure the added nodes are persisted.
                return Q.all([
                    save(trees[0].root),
                    save(trees[1].root)
                ])
                    .then(function () {
                        return Q.all([
                            core.generateTreeDiff(originRoot, trees[0].root),
                            core.generateTreeDiff(originRoot, trees[1].root),
                        ]);
                    });
            })
            .then(function (diffs) {
                var concatChanges = core.tryToConcatChanges(diffs[0], diffs[1]);

                expect(concatChanges.items.length).to.equal(0); // No conflicts detected
                return core.applyTreeDiff(originRoot, concatChanges.merge);
            })
            .then(function () {
                return core.loadSubTree(originRoot);
            })
            .then(function (st) {
                // Root, fco, base, instance, 3 children
                expect(st.length).to.equal(7);
            })
            .nodeify(done);
    });

    it('should assign a new relids when child created in bases and modified in instances', function (done) {
        var originRoot,
            basePath,
            instancePath;

        loadRootAndFCO(context.rootHash)
            .then(function (r) {
                var base = core.createNode({
                        parent: r.root,
                        base: r.fco
                    }),
                    instance = core.createNode({
                        parent: r.root,
                        base: base
                    });

                basePath = core.getPath(base);
                instancePath = core.getPath(instance);

                originRoot = r.root;
                return save(r.root);
            })
            .then(function (rootHash) {
                return Q.all([
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                ]);
            })
            .then(function (trees) {
                // We've loaded two trees from the same rootHash
                // now let's make changes.

                core.createNode({
                    parent: trees[0][basePath],
                    base: trees[0].fco,
                    relid: 'conflictRelid'
                });

                core.createNode({
                    parent: trees[1][basePath],
                    base: trees[1].fco,
                    relid: 'conflictRelid'
                });


                // Save to ensure the added nodes are persisted.
                return Q.all([
                    core.loadChildren(trees[0][instancePath]),
                    core.loadChildren(trees[1][instancePath]),
                ])
                    .then(function (children) {
                        expect(children[0].length).to.equal(1);
                        expect(children[1].length).to.equal(1);

                        core.setAttribute(children[0][0], 'name', 'instanceChildWithData0');
                        core.setAttribute(children[1][0], 'name', 'instanceChildWithData1');
                        return Q.all([
                            save(trees[0].root),
                            save(trees[1].root)
                        ]);
                    })
                    .then(function () {
                        return Q.all([
                            core.generateTreeDiff(originRoot, trees[0].root),
                            core.generateTreeDiff(originRoot, trees[1].root),
                        ]);
                    });
            })
            .then(function (diffs) {
                var concatChanges = core.tryToConcatChanges(diffs[0], diffs[1]);

                expect(concatChanges.items.length).to.equal(0); // No conflicts detected
                return core.applyTreeDiff(originRoot, concatChanges.merge);
            })
            .then(function () {
                return core.loadSubTree(originRoot);
            })
            .then(function (st) {
                // Root, fco, base, instance, 4 children
                expect(st.length).to.equal(8);
            })
            .nodeify(done);
    });

    it('should assign a new relid when child created in base and what is to become instance', function (done) {
        var originRoot,
            basePath,
            toBecomeInstancePath;

        loadRootAndFCO(context.rootHash)
            .then(function (r) {
                var base = core.createNode({
                        parent: r.root,
                        base: r.fco
                    }),
                    instance = core.createNode({
                        parent: r.root,
                        base: r.fco
                    });

                basePath = core.getPath(base);
                toBecomeInstancePath = core.getPath(instance);

                originRoot = r.root;
                return save(r.root);
            })
            .then(function (rootHash) {
                return Q.all([
                    loadRootAndFCO(rootHash, [basePath, toBecomeInstancePath]),
                    loadRootAndFCO(rootHash, [basePath, toBecomeInstancePath]),
                ]);
            })
            .then(function (trees) {
                // We've loaded two trees from the same rootHash
                // now let's make changes.

                core.createNode({
                    parent: trees[0][basePath],
                    base: trees[0].fco,
                    relid: 'conflictRelid'
                });

                core.setBase(trees[0][toBecomeInstancePath], trees[0][basePath]);

                core.createNode({
                    parent: trees[1][toBecomeInstancePath],
                    base: trees[1].fco,
                    relid: 'conflictRelid'
                });

                // Save to ensure the added nodes are persisted.
                return Q.all([
                    save(trees[0].root),
                    save(trees[1].root)
                ])
                    .then(function () {
                        return Q.all([
                            core.generateTreeDiff(originRoot, trees[0].root),
                            core.generateTreeDiff(originRoot, trees[1].root),
                        ]);
                    });
            })
            .then(function (diffs) {
                var concatChanges = core.tryToConcatChanges(diffs[0], diffs[1]);
                console.log(diffs[0]);
                expect(concatChanges.items.length).to.equal(0); // No conflicts detected
                return core.applyTreeDiff(originRoot, concatChanges.merge);
            })
            .then(function () {
                // This use-case requires a persist and reload before actions to take place..
                //TODO: In general which kind of changes requires this? setBase and moveNode??
                return save(originRoot);
            })
            .then(function (newRootHash) {
                return loadRootAndFCO(newRootHash);
            })
            .then(function (r) {
                return core.loadSubTree(r.root);
            })
            .then(function (st) {
                // Root, fco, base, instance, 3 children
                logNodes(st);
                expect(st.length).to.equal(7);
            })
            .nodeify(done);
    });

    // Symmetry
    it('should give conflict when del base in one tree and mod instance in other', function (done) {
        var originRoot,
            basePath,
            instancePath;

        loadRootAndFCO(context.rootHash)
            .then(function (r) {
                var base = core.createNode({
                        parent: r.root,
                        base: r.fco
                    }),
                    instance = core.createNode({
                        parent: r.root,
                        base: base
                    });

                basePath = core.getPath(base);
                instancePath = core.getPath(instance);

                originRoot = r.root;
                return save(r.root);
            })
            .then(function (rootHash) {
                return Q.all([
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                ]);
            })
            .then(function (trees) {
                // We've loaded two trees from the same rootHash
                // now let's make changes.

                core.deleteNode(trees[0][basePath]);

                core.setAttribute(trees[1][instancePath], 'name', 'newName');


                // Save to ensure the added nodes are persisted.
                return Q.all([
                    save(trees[0].root),
                    save(trees[1].root)
                ])
                    .then(function () {
                        return Q.all([
                            core.generateTreeDiff(originRoot, trees[0].root),
                            core.generateTreeDiff(originRoot, trees[1].root),
                        ]);
                    });
            })
            .then(function (diffs) {
                var prevDiffs = JSON.parse(JSON.stringify(diffs));
                console.log('before', JSON.stringify(diffs, null, 2));
                var concatChanges01 = core.tryToConcatChanges(diffs[0], diffs[1]);
                console.log('after', JSON.stringify(diffs, null, 2));
                var concatChanges10 = core.tryToConcatChanges(diffs[1], diffs[0]);
                expect(prevDiffs).to.deep.equal(diffs);

                expect(concatChanges01.items.length).to.equal(1);
                expect(concatChanges10.items.length).to.equal(1);
            })
            .nodeify(done);
    });

    it('should give conflict when del base in one tree and mod instance in other (reverse)', function (done) {
        var originRoot,
            basePath,
            instancePath;

        loadRootAndFCO(context.rootHash)
            .then(function (r) {
                var base = core.createNode({
                        parent: r.root,
                        base: r.fco
                    }),
                    instance = core.createNode({
                        parent: r.root,
                        base: base
                    });

                basePath = core.getPath(base);
                instancePath = core.getPath(instance);

                originRoot = r.root;
                return save(r.root);
            })
            .then(function (rootHash) {
                return Q.all([
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                    loadRootAndFCO(rootHash, [basePath, instancePath]),
                ]);
            })
            .then(function (trees) {
                // We've loaded two trees from the same rootHash
                // now let's make changes.

                core.deleteNode(trees[1][basePath]);

                core.setAttribute(trees[0][instancePath], 'name', 'newName');


                // Save to ensure the added nodes are persisted.
                return Q.all([
                    save(trees[0].root),
                    save(trees[1].root)
                ])
                    .then(function () {
                        return Q.all([
                            core.generateTreeDiff(originRoot, trees[0].root),
                            core.generateTreeDiff(originRoot, trees[1].root),
                        ]);
                    });
            })
            .then(function (diffs) {
                var prevDiffs = JSON.parse(JSON.stringify(diffs));
                console.log('before', JSON.stringify(diffs, null, 2));
                var concatChanges01 = core.tryToConcatChanges(diffs[0], diffs[1]);
                console.log('after', JSON.stringify(diffs, null, 2));
                var concatChanges10 = core.tryToConcatChanges(diffs[1], diffs[0]);
                expect(prevDiffs).to.deep.equal(diffs);

                expect(concatChanges01.items.length).to.equal(1);
                expect(concatChanges10.items.length).to.equal(1);
            })
            .nodeify(done);
    });
});
