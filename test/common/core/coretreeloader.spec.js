/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe.only('tree loading functions', function () {
    'user strict';

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
        baseNodes = {
            '': null,
            '/1924875415': null,
            '/1924875415/1059131120': null,
            '/1924875415/1359805212': null,
            '/1924875415/1544821790': null,

        };

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
        core.traverse(rootNode, null, function (node) {
            checkArray.push(core.getPath(node));
        })
            .then(function () {
                expect(checkArray).to.have.length(118);
                expect(checkArray.indexOf('/-1')).not.to.equal(-1);
                expect(checkArray.indexOf('')).not.to.equal(-1);
            })
            .nodeify(done);
    });

    it('should traverse without blocking visit', function (done) {
        var checkArray = [];
        core.traverse(rootNode, {blockingVisit: false}, function (node) {
            checkArray.push(core.getPath(node));
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
        core.traverse(rootNode, {excludeRoot: true}, function (node) {
            checkArray.push(core.getPath(node));
        })
            .then(function () {
                expect(checkArray).to.have.length(117);
                expect(checkArray.indexOf('/-1')).not.to.equal(-1);
                expect(checkArray.indexOf('')).to.equal(-1);
            })
            .nodeify(done);
    });

    it('should traverse with minimal settings', function (done) {
        this.timeout(20000);
        var checkArray = [];
        core.traverse(rootNode, {maxParallelLoad: 1, speed: 100, blockingVisit: true}, function (node) {
            checkArray.push(core.getPath(node));
        })
            .then(function () {
                expect(checkArray).to.have.length(118);
                expect(checkArray.indexOf('/-1')).not.to.equal(-1);
                expect(checkArray.indexOf('')).not.to.equal(-1);
            })
            .nodeify(done);
    });
});