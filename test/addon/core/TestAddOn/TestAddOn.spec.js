/*jshint node:true, mocha:true, expr:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals');

describe('TestAddOn', function () {
    'use strict';

    var expect = testFixture.expect,
        logger = testFixture.logger.fork('TestAddOn.spec'),

        ir,
        projectName = 'TestAddOnProject',
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        addOnId = 'TestAddOn',
        TestAddOn = testFixture.requirejs('addon/' + addOnId + '/' + addOnId + '/' + addOnId),

        safeStorage,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(safeStorage, {
                    projectName: projectName,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/EmptyProject.webgmex'
                });
            })
            .then(function (result) {
                ir = result;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            safeStorage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    it('should getName, description, version etc', function () {
        var addOn = new TestAddOn(logger, gmeConfig);

        expect(addOn.getName()).to.equal('TestAddOn');
        expect(addOn.getDescription()).to.equal('');
        expect(addOn.getVersion()).to.equal('1.0.0');
    });

    it('should configure and initialize and update the addOn', function (done) {
        var addOn = new TestAddOn(logger, gmeConfig),
            commitObj,
            rootNode;

        addOn.configure({
            core: ir.core,
            project: ir.project,
            branchName: 'master',
        });

        Q.allDone([
            testFixture.loadRootNodeFromCommit(ir.project, ir.core, ir.commitHash),
            ir.project.getCommits(ir.commitHash, 1)
        ])
            .then(function (results) {
                rootNode = results[0];
                commitObj = results[1];

                expect(addOn.initialized).to.equal(false);

                return Q.ninvoke(addOn, '_initialize', rootNode, commitObj);
            })
            .then(function (updateResult) {
                expect(updateResult.commitMessage).to.equal('');
                expect(addOn.initialized).to.equal(true);
                expect(addOn.nodePaths).to.deep.equal({'/1': 0, '': 0});

                return Q.ninvoke(addOn, '_update', rootNode, commitObj);
            })
            .then(function (updateResult) {
                expect(updateResult.commitMessage).to.equal('');
                expect(addOn.nodePaths).to.deep.equal({'/1': 1, '': 1});

                done();
            })
            .catch(done);
    });

    it('should change the name of the new node on update', function (done) {
        var addOn = new TestAddOn(logger, gmeConfig),
            commitObj,
            newNode,
            rootNode;

        addOn.configure({
            core: ir.core,
            project: ir.project,
            branchName: 'master',
        });

        Q.allDone([
            testFixture.loadRootNodeFromCommit(ir.project, ir.core, ir.commitHash),
            ir.project.getCommits(ir.commitHash, 1)
        ])
            .then(function (results) {
                rootNode = results[0];
                commitObj = results[1];

                expect(addOn.initialized).to.equal(false);

                return Q.ninvoke(addOn, '_initialize', rootNode, commitObj);
            })
            .then(function (updateResult) {
                expect(updateResult.commitMessage).to.equal('');
                expect(addOn.initialized).to.equal(true);
                expect(addOn.nodePaths).to.deep.equal({'/1': 0, '': 0});

                return testFixture.loadNode(ir.core, rootNode, '/1');
            })
            .then(function (fcoNode) {
                newNode = ir.core.createNode({parent: rootNode, base: fcoNode});

                ir.core.setAttribute(newNode, 'name', 'newNode');

                return Q.ninvoke(addOn, '_update', rootNode, commitObj);
            })
            .then(function (updateResult) {
                var newPath = ir.core.getPath(newNode),
                    nodes = {'/1': 1, '': 1};

                nodes[newPath] = 1;

                expect(updateResult.commitMessage).to.contain(addOn.getName(), addOn.getVersion());
                expect(ir.core.getAttribute(newNode, 'name')).to.equal('newNode_mod');

                expect(addOn.nodePaths).to.deep.equal(nodes);

                done();
            })
            .catch(done);
    });
});
