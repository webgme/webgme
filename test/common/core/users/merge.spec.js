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
        getRoot = testFixture.requirejs('common/core/users/getroot'),
        storage,
        context,
        gmeAuth,
        getContext = function (branchName) {
            var deferred = Q.defer(),
                branchContext = {};
            branchContext.core = context.core;
            branchContext.project = context.project;
            branchContext.commitHash = context.commitHash;
            branchContext.id = branchName;
            getRoot(branchContext)
                .then(function (result) {
                    branchContext.rootNode = result.root;

                    deferred.resolve(branchContext);
                })
                .catch(deferred.reject);
            return deferred.promise;
        };

    before(function (done) {
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
                    projectSeed: './test/common/core/users/merge/base.webgmex'
                });
            })
            .then(function (result) {
                context = result;
                return Q.allDone([
                    Q.nfcall(context.project.createBranch, 'other', result.commitHash),
                    Q.nfcall(context.project.createBranch, 'empty', result.commitHash)
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
            .then(function (/*result*/) {
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
            .then(function (/*result*/) {
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

    it('should return the conflict object if there are conflicting changes and resolve them', function (done) {
        var masterBranch = 'resolveMaster',
            otherBranch = 'resolveOther',
            masterContext,
            otherContext,
            masterPersisted,
            otherPersisted;

        Q.allDone([
            Q.nfcall(context.project.createBranch, masterBranch, context.commitHash),
            Q.nfcall(context.project.createBranch, otherBranch, context.commitHash)
        ])
            .then(function () {
                return Q.allSettled([
                    getContext(masterBranch),
                    getContext(otherBranch)
                ]);
            })
            .then(function (contexts) {
                expect(contexts).not.to.equal(null);
                expect(contexts).to.have.length(2);
                expect(contexts[0].state).to.equal('fulfilled');
                expect(contexts[1].state).to.equal('fulfilled');

                masterContext = contexts[0].value;
                otherContext = contexts[1].value;

                masterContext.core.setRegistry(masterContext.rootNode, 'something', 'masterValue');
                otherContext.core.setRegistry(otherContext.rootNode, 'something', 'otherValue');

                masterPersisted = masterContext.core.persist(masterContext.rootNode);
                otherPersisted = otherContext.core.persist(otherContext.rootNode);

                return Q.allDone([
                    masterContext.project.makeCommit(
                        masterBranch,
                        [masterContext.commitHash],
                        masterContext.core.getHash(masterContext.rootNode),
                        masterPersisted.objects,
                        'master setting core registry'),
                    otherContext.project.makeCommit(
                        otherBranch,
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
                    myBranchOrCommit: otherBranch,
                    theirBranchOrCommit: masterBranch,
                    auto: true
                });
            })
            .then(function (mergeResult) {
                expect(mergeResult).not.to.equal(null);
                expect(mergeResult).to.include.keys(['myCommitHash',
                    'theirCommitHash', 'baseCommitHash', 'diff', 'conflict']);
                expect(mergeResult.conflict.items).to.have.length(1);
                expect(mergeResult.conflict.items[0]).to.include.keys(['selected', 'mine', 'theirs']);
                expect(mergeResult.conflict.items[0].mine.path).to.equal('/reg/something');
                expect(mergeResult.conflict.items[0].theirs.path).to.equal('/reg/something');
                expect(mergeResult.conflict.items[0].mine.value).to.equal('otherValue');
                expect(mergeResult.conflict.items[0].theirs.value).to.equal('masterValue');

                mergeResult.conflict.items[0].selected = 'theirs';

                return merger.resolve({
                    project: context.project,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    partial: mergeResult
                });
            })
            .then(function (result) {
                expect(result).not.to.equal(null);
                expect(result).to.include.keys('hash', 'updatedBranch');

                return getContext(masterBranch);
            })
            .then(function (finalContext) {
                expect(finalContext.core.getRegistry(finalContext.rootNode, 'something')).to.equal('masterValue');
                done();
            })
            .catch(done);
    });

    it('should resolve to a commit if no target branch is given', function (done) {
        var masterBranch = 'resolveMasterNoBranch',
            otherBranch = 'resolveOtherNoBranch',
            masterContext,
            otherContext,
            masterPersisted,
            otherPersisted;

        Q.allDone([
            Q.nfcall(context.project.createBranch, masterBranch, context.commitHash),
            Q.nfcall(context.project.createBranch, otherBranch, context.commitHash)
        ])
            .then(function () {
                return Q.allSettled([
                    getContext(masterBranch),
                    getContext(otherBranch)
                ]);
            })
            .then(function (contexts) {
                expect(contexts).not.to.equal(null);
                expect(contexts).to.have.length(2);
                expect(contexts[0].state).to.equal('fulfilled');
                expect(contexts[1].state).to.equal('fulfilled');

                masterContext = contexts[0].value;
                otherContext = contexts[1].value;

                masterContext.core.setRegistry(masterContext.rootNode, 'something', 'masterValue');
                otherContext.core.setRegistry(otherContext.rootNode, 'something', 'otherValue');

                masterPersisted = masterContext.core.persist(masterContext.rootNode);
                otherPersisted = otherContext.core.persist(otherContext.rootNode);

                return Q.allDone([
                    masterContext.project.makeCommit(
                        masterBranch,
                        [masterContext.commitHash],
                        masterContext.core.getHash(masterContext.rootNode),
                        masterPersisted.objects,
                        'master setting core registry'),
                    otherContext.project.makeCommit(
                        otherBranch,
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
                    myBranchOrCommit: otherBranch,
                    theirBranchOrCommit: masterBranch,
                    auto: true
                });
            })
            .then(function (mergeResult) {
                expect(mergeResult).not.to.equal(null);
                expect(mergeResult).to.include.keys(['myCommitHash',
                    'theirCommitHash', 'baseCommitHash', 'diff', 'conflict']);
                expect(mergeResult.conflict.items).to.have.length(1);
                expect(mergeResult.conflict.items[0]).to.include.keys(['selected', 'mine', 'theirs']);
                expect(mergeResult.conflict.items[0].mine.path).to.equal('/reg/something');
                expect(mergeResult.conflict.items[0].theirs.path).to.equal('/reg/something');
                expect(mergeResult.conflict.items[0].mine.value).to.equal('otherValue');
                expect(mergeResult.conflict.items[0].theirs.value).to.equal('masterValue');

                mergeResult.conflict.items[0].selected = 'theirs';

                delete mergeResult.targetBranchName;

                return merger.resolve({
                    project: context.project,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    partial: mergeResult
                });
            })
            .then(function (result) {
                expect(result).not.to.equal(null);
                expect(result).to.contain('#');

                return getRoot({
                    core: context.core,
                    project: context.project,
                    id: result
                });
            })
            .then(function (rootResult) {
                expect(context.core.getRegistry(rootResult.root, 'something')).to.equal('masterValue');
                done();
            })
            .catch(done);
    });

    it('should merge two independent changes', function (done) {
        var masterBranch = 'mergeMasterBranch',
            otherBranch = 'mergeOtherBranch',
            masterContext,
            otherContext,
            masterPersisted,
            otherPersisted;

        Q.allDone([
            Q.nfcall(context.project.createBranch, masterBranch, context.commitHash),
            Q.nfcall(context.project.createBranch, otherBranch, context.commitHash)
        ])
            .then(function () {
                return Q.allSettled([
                    getContext(masterBranch),
                    getContext(otherBranch)
                ]);
            })
            .then(function (contexts) {
                expect(contexts).not.to.equal(null);
                expect(contexts).to.have.length(2);
                expect(contexts[0].state).to.equal('fulfilled');
                expect(contexts[1].state).to.equal('fulfilled');

                masterContext = contexts[0].value;
                otherContext = contexts[1].value;

                masterContext.core.setRegistry(masterContext.rootNode, 'newItem', 'masterValue');
                otherContext.core.setRegistry(otherContext.rootNode, 'otherNewItem', 'otherValue');

                masterPersisted = masterContext.core.persist(masterContext.rootNode);
                otherPersisted = otherContext.core.persist(otherContext.rootNode);

                return Q.allDone([
                    masterContext.project.makeCommit(
                        masterBranch,
                        [masterContext.commitHash],
                        masterContext.core.getHash(masterContext.rootNode),
                        masterPersisted.objects,
                        'master setting core registry'),
                    otherContext.project.makeCommit(
                        otherBranch,
                        [otherContext.commitHash],
                        otherContext.core.getHash(otherContext.rootNode),
                        otherPersisted.objects,
                        'other setting core registry')
                ]);
            })
            .then(function (commitResults) {
                //expect(commitResults).not.to.equal(null);
                //expect(commitResults).to.have.length(2);

                return merger.merge({
                    project: context.project,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    myBranchOrCommit: otherBranch,
                    theirBranchOrCommit: masterBranch,
                    auto: true
                });
            })
            .then(function (mergeResult) {
                expect(mergeResult).not.to.equal(null);
                expect(mergeResult).to.include.keys(['myCommitHash',
                    'theirCommitHash', 'baseCommitHash', 'diff', 'conflict', 'finalCommitHash', 'updatedBranch']);
                expect(mergeResult.updatedBranch).to.equal(masterBranch);

                return getContext(masterBranch);
            })
            .then(function (finalContext) {
                expect(finalContext.core.getRegistryNames(finalContext.rootNode))
                    .to.include.members(['newItem', 'otherNewItem']);

                done();
            })
            .catch(done);
    });

    it('should make a fast-forward', function (done) {
        var myContext, myCommitHash;
        Q.nfcall(context.project.createBranch, 'fastForward', context.commitHash)
            .then(function () {
                return getContext('fastForward');
            })
            .then(function (myContext_) {
                var persisted;
                //modify
                myContext = myContext_;
                myContext.core.setRegistry(myContext.rootNode, 'newItem', 'newValue');

                persisted = myContext.core.persist(myContext.rootNode);

                if (!persisted) {
                    throw new Error('failed to persist');
                }

                return myContext.project.makeCommit(
                    null,
                    [myContext.commitHash],
                    myContext.core.getHash(myContext.rootNode),
                    persisted.objects,
                    'fast-forward test'
                );
            })
            .then(function (commitResult) {
                expect(commitResult).not.to.equal(null);
                expect(commitResult.hash).to.contain('#');
                expect(commitResult.hash).to.have.length(41);

                myCommitHash = commitResult.hash;

                //fast-forward
                return merger.merge({
                    project: myContext.project,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    myBranchOrCommit: myCommitHash,
                    theirBranchOrCommit: 'fastForward',
                    auto: true
                });
            })
            .then(function (result) {
                expect(result).not.to.equal(null);
                expect(result.finalCommitHash).to.equal(myCommitHash);
                expect(result.updatedBranch).to.equal('fastForward');

                done();
            })
            .catch(done);
    });

    it('should make a fast-forward without a branch', function (done) {
        var myContext, myCommitHash, startCommitHash;
        context.project.createBranch('fastForwardWithOutBranch', context.commitHash)
            .then(function () {
                return getContext('fastForward');
            })
            .then(function (myContext_) {
                var persisted;
                //modify
                myContext = myContext_;
                startCommitHash = myContext.commitHash;
                myContext.core.setRegistry(myContext.rootNode, 'newItem', 'newValue');

                persisted = myContext.core.persist(myContext.rootNode);

                if (!persisted) {
                    throw new Error('failed to persist');
                }

                return myContext.project.makeCommit(
                    null,
                    [myContext.commitHash],
                    myContext.core.getHash(myContext.rootNode),
                    persisted.objects,
                    'fast-forward test'
                );
            })
            .then(function (commitResult) {
                expect(commitResult).not.to.equal(null);
                expect(commitResult.hash).to.contain('#');
                expect(commitResult.hash).to.have.length(41);

                myCommitHash = commitResult.hash;

                //fast-forward
                return merger.merge({
                    project: myContext.project,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    myBranchOrCommit: myCommitHash,
                    theirBranchOrCommit: startCommitHash,
                    auto: true
                });
            })
            .then(function (result) {
                expect(result).not.to.equal(null);
                expect(result.finalCommitHash).to.equal(myCommitHash);
                expect(result.updatedBranch).to.equal(undefined);

                done();
            })
            .catch(done);
    });
});