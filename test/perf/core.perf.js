/* jshint node:true, mocha: true*/

/**
 * TODO: This is outdated as serializer does not exist anymore.
 * @author pmeijer / https://github.com/pmeijer
 */
var testFixture = require('../_globals.js'),
    PROJECT_FILE = '../projects/Hakan132k.webgmex',
    jsonPatcher = testFixture.requirejs('common/util/jsonPatcher'),
    getPatchObject = testFixture.requirejs('common/storage/util').getPatchObject;
//"C:\\Users\\Zsolt\\Downloads\\Nagx3.json"
//"C:\GIT\projects\HakansBigOne.webgmex"

describe.skip('Core Performance test', function () {
    'use strict';

    var gmeConfig,
        logger,
        Q,
        Core,
        core,
        expect,
        storage,
        project,
        projectName = 'CorePerf',
        rootHash,
        gmeAuth,
        tStart,
        timeout = 500000;

    before(function (done) {
        gmeConfig = testFixture.getGmeConfig();
        logger = testFixture.logger.fork('CorePerf');
        expect = testFixture.expect;
        Q = testFixture.Q;
        Core = testFixture.Core;

        this.timeout(timeout);
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: PROJECT_FILE,
                        projectName: projectName,
                        branchName: 'master',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (importResult) {
                rootHash = importResult.rootHash;
                project = importResult.project;
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

    beforeEach(function () {
        core = new Core(project, {
            globConf: gmeConfig,
            logger: logger
        });
        tStart = Date.now();
    });

    afterEach(function () {
        console.log('Exec time', Date.now() - tStart, '[ms]');
    });

    it('should loadTree the entire-model and get all attributes', function (done) {
        var nodeCnt = 0,
            cnt = 0;
        this.timeout(timeout);
        console.log('\n### attributes ###');
        core.loadTree(rootHash)
            .then(function (nodes) {
                nodeCnt = nodes.length;
                nodes.forEach(function (node) {
                    var names = core.getAttributeNames(node);
                    names.forEach(function (name) {
                        core.getAttribute(node, name);
                        cnt += 1;
                    });
                });

                console.log('#Nodes  ', nodeCnt);
                console.log('#Cnt', cnt);
            })
            .nodeify(done);
    });

    it('should loadTree the entire-model and get all pointer paths', function (done) {
        var nodeCnt = 0,
            cnt = 0;
        this.timeout(timeout);
        console.log('\n### pointers ###');
        core.loadTree(rootHash)
            .then(function (nodes) {
                nodeCnt = nodes.length;
                nodes.forEach(function (node) {
                    var names = core.getPointerNames(node);
                    names.forEach(function (name) {
                        core.getPointerPath(node, name);
                        cnt += 1;
                    });
                });

                console.log('#Nodes  ', nodeCnt);
                console.log('#Cnt', cnt);
            })
            .nodeify(done);
    });

    it('should loadTree the entire-model and get all collections paths', function (done) {
        var nodeCnt = 0,
            cnt = 0;
        this.timeout(timeout);
        console.log('\n### collections ###');
        core.loadTree(rootHash)
            .then(function (nodes) {
                nodeCnt = nodes.length;
                nodes.forEach(function (node) {
                    var names = core.getCollectionNames(node);
                    names.forEach(function (name) {
                        core.getCollectionPaths(node, name);
                        cnt += 1;
                    });
                });

                console.log('#Nodes  ', nodeCnt);
                console.log('#Cnt', cnt);
            })
            .nodeify(done);
    });

    it('should loadTree the entire-model and get set-members paths', function (done) {
        var nodeCnt = 0,
            cnt = 0;
        this.timeout(timeout);
        console.log('\n### sets ###');
        core.loadTree(rootHash)
            .then(function (nodes) {
                nodeCnt = nodes.length;
                nodes.forEach(function (node) {
                    var names = core.getSetNames(node);
                    names.forEach(function (name) {
                        core.getMemberPaths(node, name);
                        cnt += 1;
                    });
                });

                console.log('#Nodes  ', nodeCnt);
                console.log('#Cnt', cnt);
            })
            .nodeify(done);
    });

    it('should loadTree the entire-model and get all meta nodes', function (done) {
        var nodeCnt = 0,
            cnt = 0;
        this.timeout(timeout);
        console.log('\n### meta-nodes ###');
        core.loadTree(rootHash)
            .then(function (nodes) {
                nodeCnt = nodes.length;
                nodes.forEach(function (node) {
                    cnt = Object.keys(core.getAllMetaNodes(node)).length;
                });

                console.log('#Nodes  ', nodeCnt);
                console.log('#Cnt', cnt);
            })
            .nodeify(done);
    });

    it('should traverse the whole project without issue', function (done) {
        var count = 0;
        core.loadRoot(rootHash)
            .then(function (root) {
                return core.traverse(root, {}, function (node, next) {
                    count += 1;
                    console.log(core.getPath(node), ' - ', count, ' -');
                    next();
                });
            })
            .then(function () {
                console.log('finished', count);
            })
            .nodeify(done);
    });

    it('should traverse the entire-model and get all pointer paths', function (done) {
        var nodeCnt = 0,
            cnt = 0;
        this.timeout(timeout);
        core.loadRoot(rootHash)
            .then(function (root) {
                return core.traverse(root, {}, function (node, next) {
                    nodeCnt += 1;
                    var names = core.getPointerNames(node);
                    names.forEach(function (name) {
                        core.getPointerPath(node, name);
                        cnt += 1;
                    });
                    next();
                });
            })
            .then(function () {
                console.log('#Nodes  ', nodeCnt);
                console.log('#Cnt', cnt);
            })
            .nodeify(done);
    });

    describe('on huge project', function () {
        var core,
            projectName = 'hugeProjectTest',
            projectId = testFixture.projectName2Id(projectName),
            project,
            rootHash,
            baseCommitHash;

        before(function (done) {
            this.timeout(40000); //this should be only changed if the time increase is accepted due to some new feature
            testFixture.importProject(storage,
                {
                    projectSeed: 'test/perf/hugeProj.webgmex',
                    projectName: projectName,
                    branchName: 'master',
                    gmeConfig: gmeConfig,
                    logger: logger
                })
                .then(function (importResult) {
                    expect(importResult.projectId).to.contain(projectName);
                    project = importResult.project;
                    rootHash = importResult.rootHash;
                    core = importResult.core;
                    baseCommitHash = importResult.commitHash;
                })
                .nodeify(done);
        });

        it('should persist small change quickly', function (done) {
            //set the registry of node /Q/t/W/8
            console.time('init');
            core.loadRoot(rootHash)
                .then(function (root) {
                    return core.loadByPath(root, '/Q/t/W/8');
                })
                .then(function (node) {
                    expect(core.getGuid(node)).to.equal('8e16e5dd-8137-66c3-1d08-3f331a686282');

                    console.timeEnd('init');
                    core.setRegistry(node, 'position', {x: 500, y: 500});

                    var persisted = core.persist(core.getRoot(node));

                    console.time('patchCreation');
                    var patch = jsonPatcher.create(persisted.objects[persisted.rootHash].oldData,
                        persisted.objects[persisted.rootHash].newData);
                    console.timeEnd('patchCreation');

                    console.log('patch', patch);
                    console.time('patchApplication');
                    var patchResult = jsonPatcher.apply(persisted.objects[persisted.rootHash].oldData, patch);
                    console.timeEnd('patchApplication');

                    patchResult.result._id = persisted.objects[persisted.rootHash].newHash;
                    expect(patchResult.status).to.equal('success');

                    //TODO this should be used in the code as well to make it simpler
                    persisted.objects[persisted.rootHash] = getPatchObject(persisted.objects[persisted.rootHash].oldData,
                        persisted.objects[persisted.rootHash].newData);

                    console.time('makeCommit');
                    Q.nfcall(project.makeCommit,
                        projectId,
                        'master',
                        [baseCommitHash],
                        persisted.rootHash, persisted.objects, 'single reposition');

                })
                .then(function () {
                    console.timeEnd('makeCommit');
                })
                .nodeify(done);
        });

        it('should export quickly', function (done) {
            this.timeout(120000);
            core.loadRoot(rootHash)
                .then(function (root) {
                    // return Q.nfcall(serializer.export, core, root);
                    return testFixture.storageUtil.getProjectJson(project, {commitHash: baseCommitHash});
                })
                .then(function (jsonProject) {
                    // expect(jsonProject.nodes['8e16e5dd-8137-66c3-1d08-3f331a686282']).not.to.equal(undefined);
                    // console.log(jsonProject.objects.length);
                    expect(jsonProject).not.to.eql({});
                })
                .nodeify(done);
        });

        it('should traverse the whole huge project without issue', function (done) {
            this.timeout(120000000);
            var count = 0;
            console.time('traverse');
            console.time('complete');
            core.loadRoot(rootHash)
                .then(function (root) {
                    return core.traverse(root, {blockingVisit: false, maxParallelLoad: 400, speed: 2},
                        function (node, next) {
                            count += 1;
                            require('fs').appendFileSync('pref_test.res', count + ' : ' +
                                core.getPath(node) + ' : ' + core.getGuid(node) + '\n');
                            if (count % 1000 === 0) {
                                console.log(count);
                                console.timeEnd('traverse');
                                console.time('traverse');
                            }
                            next();
                        }
                    );
                })
                .then(function () {
                    console.log('finished - ', count);
                    console.timeEnd('complete');
                })
                .nodeify(done);
        });

        it('should load the whole huge project', function (done) {
            this.timeout(1200000);
            var count = 0;
            console.time('load');
            core.loadTree(rootHash)
                .then(function (nodes) {
                    console.timeEnd('load');
                    console.log(nodes.length);
                    for (var i = 0; i < nodes.length; i += 1) {
                        expect(core.getAttribute(nodes[i], 'name')).not.to.equal('');
                        expect(core.getBaseRoot(nodes[i])).not.to.eql(null);
                    }
                })
                .nodeify(done);
        });
        it('should load the whole huge project without instances', function (done) {
            this.timeout(1200000);
            var count = 0;
            console.time('load');
            core.loadRoot(rootHash)
                .then(function (root) {
                    return core.loadOwnSubTree(root);
                })
                .then(function (nodes) {
                    console.timeEnd('load');
                    console.log(nodes.length);
                })
                .nodeify(done);
        });

        it('should calculate jsonMeta information quickly', function (done) {
            core.loadRoot(rootHash)
                .then(function (root) {
                    var allMetaNodes = core.getAllMetaNodes(root),
                        i,
                        meta;

                    console.time('getJsonMeta');
                    for (i in allMetaNodes) {
                        meta = core.getJsonMeta(allMetaNodes[i]);
                    }
                    console.timeEnd('getJsonMeta');

                    console.time('getOwnJsonMeta');
                    for (i in allMetaNodes) {
                        meta = core.getOwnJsonMeta(allMetaNodes[i]);
                    }
                    console.timeEnd('getOwnJsonMeta');
                })
                .nodeify(done);
        });
    });

});
