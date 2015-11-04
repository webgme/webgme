/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../../_globals');

describe('Plugin ExportImport - assets', function () {
    'use strict';

    var pluginName = 'ExportImport',
        BlobFSBackend = require('../../../../src/server/middleware/blob/BlobFSBackend'),
        BlobRunPluginClient = require('../../../../src/server/middleware/blob/BlobRunPluginClient'),
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../../src/plugin/climanager'),
        project,
        projectName = 'Plugin_ExportImport_Assets',
        commitHash,
        aTxtHash,
        aaTxtHash,
        bTxtHash,
        assZipHash,
        gmeAuth,
        blobClient,
        importResult,
        pluginManager;

    before(function (done) {
        var importParam = {
                projectSeed: './test/plugin/coreplugins/ExportImport/assets/assetsProject.json',
                projectName: projectName,
                logger: logger,
                gmeConfig: gmeConfig
            },
            artifact;
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                return Q.ninvoke(testFixture, 'rimraf', gmeConfig.blob.fsDir);
            })
            .then(function () {
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult_) {
                importResult = importResult_;
                project = importResult.project;
                commitHash = importResult.commitHash;
                pluginManager = new PluginCliManager(project, logger, gmeConfig);
                return Q.allDone([
                    project.createBranch('b1', commitHash),
                    project.createBranch('b2', commitHash),
                    project.createBranch('b3', commitHash)
                ]);
            })
            .then(function () {
                var blobBackend = new BlobFSBackend(gmeConfig),
                    filePath1 = './test/plugin/coreplugins/ExportImport/assets/a.txt',
                    filePath2 = './test/plugin/coreplugins/ExportImport/assets/b.txt',
                    filePath3 = './test/plugin/coreplugins/ExportImport/assets/aa.txt';
                blobClient = new BlobRunPluginClient(blobBackend);

                return Q.allDone([
                    Q.ninvoke(blobClient, 'putFile', 'a.txt', testFixture.fs.readFileSync(filePath1)),
                    Q.ninvoke(blobClient, 'putFile', 'b.txt', testFixture.fs.readFileSync(filePath2)),
                    Q.ninvoke(blobClient, 'putFile', 'aa.txt', testFixture.fs.readFileSync(filePath3))
                ]);
            })
            .then(function (blobHashes) {
                artifact = blobClient.createArtifact('ass');
                aTxtHash = blobHashes[0];
                bTxtHash = blobHashes[1];
                aaTxtHash = blobHashes[2];
                return Q.allDone([
                    Q.ninvoke(artifact, 'addMetadataHash', 'a.txt', aTxtHash),
                    Q.ninvoke(artifact, 'addMetadataHash', 'b.txt', bTxtHash)
                ]);
            })
            .then(function () {
                return Q.ninvoke(artifact, 'save');
            })
            .then(function (assHash) {
                assZipHash = assHash;
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

    it('should export ValidObject', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/339332505'
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([aTxtHash + '.content', aTxtHash + '.metadata', 'lib.json']);
            })
            .nodeify(done);
    });

    it('should export ValidComplex', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/560565608'
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    aTxtHash + '.content',
                    bTxtHash + '.content',
                    aTxtHash + '.metadata',
                    bTxtHash + '.metadata',
                    assZipHash + '.metadata',
                    'lib.json']);
            })
            .nodeify(done);
    });

    it('should export WithNonAssetHash', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/1655649505'
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    'lib.json']);
            })
            .nodeify(done);
    });

    it('should export SameObjectTwice', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/222236096'
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    aTxtHash + '.content',
                    aTxtHash + '.metadata',
                    'lib.json']);
            })
            .nodeify(done);
    });

    it('should export SameContentTwice', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/1141997039'
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    aTxtHash + '.content',
                    aTxtHash + '.metadata',
                    aaTxtHash + '.metadata',
                    aaTxtHash + '.content',
                    'lib.json']);
            })
            .nodeify(done);
    });

    it('should export SameComplexTwice', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/1667328501'
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    aTxtHash + '.content',
                    aTxtHash + '.metadata',
                    bTxtHash + '.metadata',
                    bTxtHash + '.content',
                    assZipHash + '.metadata',
                    'lib.json']);
            })
            .nodeify(done);
    });

    it('should export SameContentWithinComplex', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/1667328501'
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    aTxtHash + '.content',
                    aTxtHash + '.metadata',
                    bTxtHash + '.metadata',
                    bTxtHash + '.content',
                    assZipHash + '.metadata',
                    'lib.json']);
            })
            .nodeify(done);
    });

    it('should export entire project', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
            },
            pluginConfig = {
                type: 'Export',
                assets: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                console.log(result.artifacts[0]);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    aTxtHash + '.content',
                    aTxtHash + '.metadata',
                    aaTxtHash + '.content',
                    aaTxtHash + '.metadata',
                    bTxtHash + '.metadata',
                    bTxtHash + '.content',
                    assZipHash + '.metadata',
                    'project.json']);
            })
            .nodeify(done);
    });

    it('should import and export project', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1',
            },
            pluginConfig = {
                type: 'ImportProject',
                assets: true
            },
            files,
            artifact = blobClient.createArtifact('files'),
            dir = './test/plugin/coreplugins/ExportImport/assets/exported/';

        files = testFixture.fs.readdirSync(dir);
        // Clear the blob
        Q.ninvoke(testFixture, 'rimraf', gmeConfig.blob.fsDir)
            .then(function () {
                // Add the exported assets
                return Q.allDone(files.map(function (fName) {
                        return Q.ninvoke(artifact, 'addFileAsSoftLink',
                            fName, testFixture.fs.readFileSync(dir + fName));
                    })
                );
            })
            .then(function () {
                // Add the project json
                return Q.ninvoke(artifact, 'addFileAsSoftLink', 'project.json', testFixture.fs.readFileSync(
                    './test/plugin/coreplugins/ExportImport/assets/assetsProject.json'));
            })
            .then(function () {
                // Save the artifact
                return Q.ninvoke(artifact, 'save');
            })
            .then(function (fileHash) {
                pluginConfig.file = fileHash;
                return Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext);
            })
            .then(function (result) {
                expect(result.success).to.equal(true);
                // Now export the project
                pluginConfig.type = 'Export';
                return Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext);
            })
            .then(function (result) {
                expect(result.success).to.equal(true);
                return Q.ninvoke(blobClient, 'getMetadata', result.artifacts[0]);
            })
            .then(function (metadata) {
                var contents = Object.keys(metadata.content);
                expect(contents).to.have.members([
                    aTxtHash + '.content',
                    aTxtHash + '.metadata',
                    aaTxtHash + '.content',
                    aaTxtHash + '.metadata',
                    bTxtHash + '.metadata',
                    bTxtHash + '.content',
                    assZipHash + '.metadata',
                    'project.json']);
            })
            .nodeify(done);
    });

    it('should fail to import when there is missing content', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b2',
            },
            pluginConfig = {
                type: 'ImportProject',
                assets: true
            },
            files,
            artifact = blobClient.createArtifact('files'),
            dir = './test/plugin/coreplugins/ExportImport/assets/exported/';

        files = testFixture.fs.readdirSync(dir);
        // Clear the blob
        Q.ninvoke(testFixture, 'rimraf', gmeConfig.blob.fsDir)
            .then(function () {
                // Add the exported assets
                return Q.allDone(files.map(function (fName) {
                        if (fName === '7c2be6ee36611cb8a7e27a0a91b34a1066b3c756.metadata') {
                            return Q.ninvoke(artifact, 'addFileAsSoftLink',
                                fName, testFixture.fs.readFileSync(dir + fName));
                        }
                        return Q();
                    })
                );
            })
            .then(function () {
                // Add the project json
                return Q.ninvoke(artifact, 'addFileAsSoftLink', 'project.json', testFixture.fs.readFileSync(
                    './test/plugin/coreplugins/ExportImport/assets/assetsProject.json'));
            })
            .then(function () {
                // Save the artifact
                return Q.ninvoke(artifact, 'save');
            })
            .then(function (fileHash) {
                pluginConfig.file = fileHash;
                return Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.equal('Failed adding some of the assets, see error logs');
            })
            .nodeify(done);
    });
});