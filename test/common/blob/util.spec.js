/*jshint node:true, mocha:true, expr:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('Blob/Storage-util', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('ImportModels'),
        projectName = 'blobUtilTest',
        storageUtil = testFixture.requirejs('common/storage/util'),
        blobUtil = testFixture.requirejs('blob/util'),
        blobClient,
        core,
        rootHash,
        project,
        gmeAuth,
        storage,
        commitHash;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                // This uses in memory storage. Use testFixture.getMongoStorage to persist test to database.
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: './seeds/EmptyProject.webgmex',
                    projectName: projectName,
                    branchName: 'master',
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                project = importResult.project;
                commitHash = importResult.commitHash;
                core = importResult.core;
                rootHash = importResult.rootHash;
                blobClient = importResult.blobClient;
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.closeDatabase()
            .then(function () {
                return gmeAuth.unload();
            })
            .nodeify(done);
    });

    it('should export only project.json with no given hash-like assets', function (done) {
        var root;

        core.loadRoot(rootHash)
            .then(function (root_) {
                root = root_;

                return storageUtil.getProjectJson(project, {commitHash: commitHash});
            })
            .then(function (projectJson) {
                return blobUtil.buildProjectPackage(logger, blobClient, projectJson, true, 'no-files.zip');
            })
            .then(function (artieHash) {
                return blobClient.getMetadata(artieHash);
            })
            .then(function (metadata) {
                expect(Object.keys(metadata.content)).to.deep.equal(['project.json']);
            })
            .nodeify(done);
    });

    it('should export attached file to asset', function (done) {
        var root;

        core.loadRoot(rootHash)
            .then(function (root_) {
                root = root_;

                return blobClient.putFile('text.txt', 'cont');
            })
            .then(function (metadataHash) {
                core.setAttribute(root, 'asset', metadataHash);
                var persisted = core.persist(root);

                return project.makeCommit(null, [commitHash], persisted.rootHash, persisted.objects, 'ass');
            })
            .then(function (commitResult) {
                return storageUtil.getProjectJson(project, {commitHash: commitResult.hash});
            })
            .then(function (projectJson) {
                return blobUtil.buildProjectPackage(logger, blobClient, projectJson, true, 'single-file.zip');
            })
            .then(function (artieHash) {
                return blobClient.getMetadata(artieHash);
            })
            .then(function (metadata) {
                expect(Object.keys(metadata.content).length).to.equal(3);
            })
            .nodeify(done);
    });

    it('should export attached artifact to asset', function (done) {
        var root,
            artie;

        core.loadRoot(rootHash)
            .then(function (root_) {
                artie = blobClient.createArtifact('my-artifact');
                root = root_;

                return artie.addFilesAsSoftLinks({'text.txt': 'cont1', 'text2.txt': 'cont2'});
            })
            .then(function () {

                return artie.save();
            })
            .then(function (metadataHash) {
                core.setAttribute(root, 'asset', metadataHash);
                var persisted = core.persist(root);

                return project.makeCommit(null, [commitHash], persisted.rootHash, persisted.objects, 'ass');
            })
            .then(function (commitResult) {
                return storageUtil.getProjectJson(project, {commitHash: commitResult.hash});
            })
            .then(function (projectJson) {
                return blobUtil.buildProjectPackage(logger, blobClient, projectJson, true, 'complex-artie.zip');
            })
            .then(function (artieHash) {
                return blobClient.getMetadata(artieHash);
            })
            .then(function (metadata) {
                expect(Object.keys(metadata.content).length).to.equal(6);
            })
            .nodeify(done);
    });

    it('should not export hash like attribute and only log warning', function (done) {
        var root,
            loggedWarn = false,
            dummyLogger = {
                debug: function() {},
                info: function () {},
                warn: function (a) {
                    if (a.indexOf('When building project package could not retrieve metadata') > -1) {
                        loggedWarn = true;
                    }
                },
                error: logger.error
            };

        core.loadRoot(rootHash)
            .then(function (root_) {
                root = root_;
                core.setAttribute(root, 'assetLike', '7ee240962a78962fce20c679911fa01682fefabd');
                var persisted = core.persist(root);

                return project.makeCommit(null, [commitHash], persisted.rootHash, persisted.objects, 'ass');
            })
            .then(function (commitResult) {
                return storageUtil.getProjectJson(project, {commitHash: commitResult.hash});
            })
            .then(function (projectJson) {
                return blobUtil.buildProjectPackage(dummyLogger, blobClient, projectJson, true, 'hash-like-attr.zip');
            })
            .then(function (artieHash) {
                return blobClient.getMetadata(artieHash);
            })
            .then(function (metadata) {
                expect(Object.keys(metadata.content)).to.deep.equal(['project.json']);
                expect(loggedWarn).to.equal(true);
            })
            .nodeify(done);
    });
});