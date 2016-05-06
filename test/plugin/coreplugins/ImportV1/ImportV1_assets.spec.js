/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../../_globals');

describe('Plugin ImportV1 - assets', function () {
    'use strict';

    var pluginName = 'ImportV1',
        BlobFSBackend = require('../../../../src/server/middleware/blob/BlobFSBackend'),
        BlobRunPluginClient = require('../../../../src/server/middleware/blob/BlobRunPluginClient'),
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../../src/plugin/climanager'),
        project,
        projectName = 'Plugin_ImportV1_Assets',
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
                projectSeed: 'seeds/EmptyProject.webgmex',
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
                var blobBackend = new BlobFSBackend(gmeConfig, logger),
                    filePath1 = './test/plugin/coreplugins/ImportV1/assets/a.txt',
                    filePath2 = './test/plugin/coreplugins/ImportV1/assets/b.txt',
                    filePath3 = './test/plugin/coreplugins/ImportV1/assets/aa.txt';
                blobClient = new BlobRunPluginClient(blobBackend, logger.fork('Blob'));

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
            dir = './test/plugin/coreplugins/ImportV1/assets/exported/';

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
                    './test/plugin/coreplugins/ImportV1/assets/assetsProject.json'));
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