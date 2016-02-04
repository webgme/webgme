/* jshint node:true, mocha: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */
var testFixture = require('../_globals.js'),
    PROJECT_FILE = 'seeds/ActivePanels.json';

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
        keysCnt,
        objKeys = Object.keys,
        gmeAuth;

    before(function (done) {
        gmeConfig = testFixture.getGmeConfig();
        logger = testFixture.logger.fork('CorePerf');
        expect = testFixture.expect;
        Q = testFixture.Q;
        Core = testFixture.Core;

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

        keysCnt = 0;

        Object.keys = function () {
            keysCnt += 1;
            return objKeys.apply(null, arguments);
        };
    });

    afterEach(function () {
        console.log('\n#Object.keys invocations', keysCnt, '\n');
        Object.keys = objKeys;
    });

    it('should traverse the entire-model and get all attributes', function (done) {
        var nodeCnt = 0,
            cnt = 0;
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

    it('should traverse the entire-model and get all pointer paths', function (done) {
        var nodeCnt = 0,
            cnt = 0;
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

    it('should traverse the entire-model and get all collections paths', function (done) {
        var nodeCnt = 0,
            cnt = 0;
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

    it('should traverse the entire-model and get set-members paths', function (done) {
        var nodeCnt = 0,
            cnt = 0;

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

    it('should traverse the entire-model and get all meta nodes', function (done) {
        var nodeCnt = 0,
            cnt = 0;

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

});