/* jshint node:true, mocha: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */
var testFixture = require('../../_globals.js');

describe('CoreQ Async with Promises', function () {
    'use strict';

    var gmeConfig,
        logger,
        Q,
        expect,
        storage,
        projectName = 'CoreQAsync',
        core,
        rootHash,

        gmeAuth;

    before(function (done) {
        gmeConfig = testFixture.getGmeConfig();
        logger = testFixture.logger.fork('CoreQ');
        expect = testFixture.expect;
        Q = testFixture.Q;

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: 'seeds/ActivePanels.webgmex',
                        projectName: projectName,
                        branchName: 'master',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (importResult) {
                core = importResult.core;
                rootHash = importResult.rootHash;
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

    it('should loadRoot', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                expect(core.getAttribute(rootNode, 'name')).to.equal('ROOT');
            })
            .nodeify(done);
    });

    it('should fail to loadRoot and return error', function (done) {
        core.loadRoot('#hashDoesNotExist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.name).to.eql('CoreIllegalArgumentError');
            })
            .nodeify(done);
    });

    it('should loadChild', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadChild(rootNode, '1');
            })
            .then(function (node) {
                expect(core.getAttribute(node, 'name')).to.equal('FCO');
            })
            .nodeify(done);
    });

    it('should fail to loadChild from non node', function (done) {
        core.loadChild({}, '1')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                // expect(err.message).to.include('ASSERT failed');
                expect(err.name).to.eql('CoreIllegalArgumentError');
            })
            .nodeify(done);
    });

    it('should loadByPath', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadByPath(rootNode, '/1');
            })
            .then(function (node) {
                expect(core.getAttribute(node, 'name')).to.equal('FCO');
            })
            .nodeify(done);
    });

    it('should fail to loadByPath from non node', function (done) {
        core.loadByPath({}, '/1')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.name).to.eql('CoreIllegalArgumentError');
            })
            .nodeify(done);
    });

    it('should loadChildren', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadChildren(rootNode);
            })
            .then(function (nodes) {
                expect(nodes.length).to.equal(3);
            })
            .nodeify(done);
    });

    it('should fail to loadChildren from non node', function (done) {
        core.loadChildren({})
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.name).to.eql('CoreIllegalArgumentError');
            })
            .nodeify(done);
    });

    it('should loadOwnChildren', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadOwnChildren(rootNode);
            })
            .then(function (nodes) {
                expect(nodes.length).to.equal(3);
            })
            .nodeify(done);
    });

    it('should fail to loadOwnChildren from non node', function (done) {
        core.loadOwnChildren({})
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.name).to.eql('CoreIllegalArgumentError');
            })
            .nodeify(done);
    });

    it('should loadPointer', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadChild(rootNode, '1303043463');
            })
            .then(function (node) {
                return core.loadPointer(node, 'base');
            })
            .then(function (node) {
                expect(core.getAttribute(node, 'name')).to.equal('ModelEditor');
            })
            .nodeify(done);
    });

    it('should fail to loadPointer from non node', function (done) {
        core.loadPointer({}, 'base')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.name).to.eql('CoreIllegalArgumentError');
            })
            .nodeify(done);
    });

    // loadCollection

    it('should loadSubTree', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadSubTree(rootNode);
            })
            .then(function (nodes) {
                expect(nodes.length).to.equal(17);
            })
            .nodeify(done);
    });

    it('should fail to loadSubTree from non node', function (done) {
        core.loadSubTree({})
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.name).to.eql('CoreIllegalArgumentError');
            })
            .nodeify(done);
    });

    it('should loadOwnSubTree', function (done) {
        core.loadRoot(rootHash)
            .then(function (rootNode) {
                return core.loadOwnSubTree(rootNode);
            })
            .then(function (nodes) {
                expect(nodes.length).to.equal(17);
            })
            .nodeify(done);
    });

    it('should fail to loadOwnSubTree from non node', function (done) {
        core.loadOwnSubTree({})
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.include('valid node');
            })
            .nodeify(done);
    });

    it('should loadTree', function (done) {
        core.loadTree(rootHash)
            .then(function (nodes) {
                expect(nodes.length).to.equal(17);
            })
            .nodeify(done);
    });

    it('should fail to loadTree from invalid hash', function (done) {
        core.loadTree('#doesNotExist')
            .then(function () {
                throw new Error('Should have failed');
            })
            .catch(function (err) {
                expect(err.message).to.include('valid hash');
            })
            .nodeify(done);
    });

    it('should return with an null if invalid path is loaded', function (done) {
        core.loadRoot(rootHash)
            .then(function (root) {
                return core.loadByPath(root, '/not/valid/path');
            })
            .then(function (node) {
                expect(node).to.equal(null);
            })
            .nodeify(done);
    });

    it('should ASSERT if isEmpty is called on a non-node object', function () {
        try {
            core.isEmpty({});
        } catch (e) {
            expect(e).not.to.equal(null);
            return;
        }
        throw new Error('should have failed to use isEmpty');
    });
});