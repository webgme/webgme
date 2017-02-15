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

    it('should assign a new relid when child', function (done) {
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

                // core.setAttribute(trees[0].fco, 'name', 'name0');
                // core.setAttribute(trees[1].fco, 'name', 'name1');

                //core.setAttribute(
                    core.createNode({
                    parent: trees[0][basePath],
                    base: trees[0].fco,
                    relid: 'conflictRelid'});
                //}), 'name', 'baseChild');

                //core.setAttribute(
                    core.createNode({
                    parent: trees[1][basePath],
                    base: trees[1].fco,
                    relid: 'conflictRelid'});
                //}), 'name', 'instanceChild');

                //core.setPointer(trees[0][basePath], 'pppp', trees[0].fco);


                // Save to ensure the added nodes are persisted.
                return Q.all([
                    save(trees[1].root),
                    save(trees[0].root)
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
                //console.log(concatChanges.merge);
                return core.applyTreeDiff(originRoot, concatChanges.merge);
            })
            // .then(function () {
            //     return save(originRoot);
            // })
            // .then(function (newRootHash) {
            //     return loadRootAndFCO(newRootHash);
            // })
            .then(function (r) {
                //console.log(originRoot.data.ovr);
                return core.loadSubTree(originRoot);
            })
            .then(function (st) {
                st.forEach(function (node) {
                    // console.log(core.getPath(node), core.getAttribute(node, 'someAttr'));
                    if (core.getParent(node) && core.getPath(core.getParent(node)) === instancePath) {
                        console.log('\n', core.getPath(node), '-', core.getBase(node) ? core.getPath(core.getBase(node)) : null);
                    }
                });
            })
            .nodeify(done);
    });
});