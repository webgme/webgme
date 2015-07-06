/*jshint node:true, mocha:true */

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../../_globals');

describe('merge - library', function () {
    'use strict';
    var projectName = 'mergeLibrary',
        projectId = testFixture.projectName2Id(projectName),
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('merger.spec'),
        expect = testFixture.expect,
        merger = testFixture.requirejs('common/core/users/merge'),
        storage,
        context,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function(){
                return storage.deleteProject({projectId:projectId});
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger.fork('import'),
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/common/core/users/merge/base.json'
                });
            })
            .then(function (result) {
                context = result;
                return Q.all([
                    Q.nfcall(context.project.createBranch, 'other', result.commitHash),
                    Q.nfcall(context.project.createBranch, 'empty', result.commitHash)
                ]);
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.deleteProject({projectId: projectId})
            .then(function () {
                return Q.all([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .nodeify(done);
    });

    it('should go fine to apply empty patch', function (done) {
        merger.apply({
            project: context.project,
            logger: logger,
            gmeConfig: gmeConfig,
            patch: {},
            branchOrCommit: 'empty',
            noUpdate: true
        }).nodeify(done);
    });

    it('should fail to get diff from unknown branch', function (done) {
        merger.apply({
            project: context.project,
            logger: logger,
            gmeConfig: gmeConfig,
            patch: {},
            branchOrCommit: 'unknownBranch',
            noUpdate: true
        })
            .then(function (result) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                done();
            });
    });

    it('should fail to get diff from unknown commit', function (done) {
        merger.apply({
            project: context.project,
            logger: logger,
            gmeConfig: gmeConfig,
            patch: {},
            branchOrCommit: '#42424242424242',
            noUpdate: true
        })
            .then(function (result) {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                done();
            });
    });

    it('should merge identical branches without change keeping the target', function (done) {
        merger.merge({
            project: context.project,
            logger: logger,
            gmeConfig: gmeConfig,
            myBranchOrCommit: 'empty',
            theirBranchOrCommit: 'empty',
            auto: true
        })
            .then(function (result) {
                expect(result).not.to.equal(null);
                expect(result.finalCommitHash).to.equal(context.commitHash);
                expect(result.updatedBranch).to.equal('empty');
                done();
            })
            .catch(done);
    });

    it('should merge identical commits without change keeping the target', function (done) {
        merger.merge({
            project: context.project,
            logger: logger,
            gmeConfig: gmeConfig,
            myBranchOrCommit: context.commitHash,
            theirBranchOrCommit: context.commitHash,
            auto: true
        })
            .then(function (result) {
                expect(result).not.to.equal(null);
                expect(result.finalCommitHash).to.equal(context.commitHash);
                expect(result.updatedBranch).to.equal(undefined);
                done();
            })
            .catch(done);
    });

    it.skip('should return the conflict object if there is conflicting changes', function (done) {
        var masterContext,
            otherContext,
            masterPersisted,
            otherPersisted;

        Q.all([
            testFixture.openContext(storage, gmeConfig, logger, {
                projectName: projectName,
                branchName: 'master'
            }),
            testFixture.openContext(storage, gmeConfig, logger, {
                projectName: projectName,
                branchName: 'other'
            })
        ])
            .then(function (contexts) {
                expect(contexts).not.to.equal(null);
                expect(contexts).to.have.length(2);

                masterContext = contexts[0];
                otherContext = contexts[1];

                masterContext.core.setRegistry(masterContext.rootNode, 'something', 'masterValue');
                otherContext.core.setRegistry(otherContext.rootNode, 'something', 'otherValue');

                masterPersisted = masterContext.core.persist(masterContext.rootNode);
                otherPersisted = otherContext.core.persist(otherContext.rootNode);

                return Q.all([
                    masterContext.project.makeCommit(
                        'master',
                        [masterContext.commitHash],
                        masterContext.core.getHash(masterContext.rootNode),
                        masterPersisted.objects,
                        'master setting core registry'),
                    otherContext.project.makeCommit(
                        'other',
                        [otherContext.commitHash],
                        otherContext.core.getHash(otherContext.rootNode),
                        otherPersisted.objects,
                        'other setting core registry')
                ]);
            })
            .then(function (commitResults) {
                expect(commitResults).not.to.equal(null);
                expect(commitResults).to.have.length(2);

                return merger.merge({
                    project: context.project,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    myBranchOrCommit: 'other',
                    theirBranchOrCommit: 'master',
                    auto: true
                });
            })
            .then(function (mergeResult) {
                expect(mergeResult).not.to.equal(null);
                expect(mergeResult).to.include.keys(['myCommitHash',
                    'theirCommitHash', 'baseCommitHash', 'diff', 'conflict']);
                expect(mergeResult.conflict.items).to.have.length(1);
                expect(mergeResult.conflict.items[0]).to.include.keys(['selected','mine','theirs']);
                expect(mergeResult.conflict.items[0].mine.path).to.equal('/reg/something');
                expect(mergeResult.conflict.items[0].theirs.path).to.equal('/reg/something');
                expect(mergeResult.conflict.items[0].mine.value).to.equal('otherValue');
                expect(mergeResult.conflict.items[0].theirs.value).to.equal('masterValue');
                done();
            })
            .catch(done);
    });

});