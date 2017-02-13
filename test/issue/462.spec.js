/*jshint node:true, mocha:true */

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals');

describe('issue462', function () {
    'use strict';
    var projectName = 'issue462test',
        projectId = testFixture.projectName2Id(projectName),
        Q = testFixture.Q,
        gmeConfig = JSON.parse(JSON.stringify(testFixture.getGmeConfig())),
        logger = testFixture.logger.fork('462.spec'),
        expect = testFixture.expect,
        merger = testFixture.requirejs('common/core/users/merge'),
        storage,
        context,
        gmeAuth;

    before(function (done) {
        gmeConfig.storage.keyType = 'rand160Bits';
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectId: projectId});
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/issue/462/project.webgmex'
                });
            })
            .then(function (result) {
                context = result;
                return Q.allDone([
                    Q.nfcall(context.project.createBranch, 'apply', result.commitHash),
                    Q.nfcall(context.project.createBranch, 'merge', result.commitHash)
                ]);
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.deleteProject({projectId: projectId})
            .then(function () {
                return Q.allDone([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .nodeify(done);
    });

    it('should be able to update and commit and merge back into the master', function (done) {
        //do the update
        var relids = ['1591506645'];

        Q.nfcall(context.core.loadByPath, context.rootNode, '/1007576016/1659905525/1591506645')
            .then(function (node) {
                var container = context.core.getParent(node),
                    persisted,
                    i;

                for (i = 0; i < 100; i += 1) {
                    relids.push(context.core.getRelid(context.core.copyNode(node, container)));
                }
                persisted = context.core.persist(context.rootNode);


                if (!persisted) {
                    throw new Error('persist failed');
                }

                return Q.ninvoke(context.project,
                    'makeCommit',
                    null,
                    [context.commitHash],
                    context.core.getHash(context.rootNode),
                    persisted.objects,
                    'creating a new object');
            })
            .then(function (commitResult) {
                expect(commitResult).not.to.equal(null);
                expect(commitResult.hash).to.contain('#');
                return merger.merge({
                    project: context.project,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    myBranchOrCommit: commitResult.hash,
                    theirBranchOrCommit: 'master',
                    auto: true
                });
            })
            .then(function (mergeResult) {
                expect(mergeResult).not.to.equal(null);
                expect(mergeResult.updatedBranch).to.equal('master');

                return Q.ninvoke(context.project, 'getBranchHash', 'master');
            })
            .then(function (commitHash) {
                return Q.ninvoke(context.project, 'loadObject', commitHash);
            })
            .then(function (commitObject) {
                return Q.nfcall(context.core.loadRoot, commitObject.root);
            })
            .then(function (root) {
                return Q.nfcall(context.core.loadByPath, root, '/1007576016/1659905525');
            })
            .then(function (container) {
                expect(context.core.getChildrenRelids(container)).to.have.members(relids);
                done();
            })
            .catch(done);
    });

});