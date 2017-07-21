/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals');

describe.only('Generate All Plugin', function () {
    'use strict';

    var pluginName = 'GenerateAll',
        projectName = 'GenerateAllPluginProj',
        Q = testFixture.Q,
        blobClient,
        gmeConfig,
        storage,
        expect,
        project,
        commitHash,
        gmeAuth,
        importResult,
        pluginManager;

    before(function (done) {
        var logger = testFixture.logger.fork(pluginName),
            PluginCliManager = require('../../../../src/plugin/climanager'),
            BlobClient = require('../../../../src/server/middleware/blob/BlobClientWithFSBackend');

        gmeConfig = testFixture.getGmeConfig();
        blobClient = new BlobClient(gmeConfig, logger);

        expect = testFixture.expect;

        var importParam = {
            projectSeed: './seeds/EmptyProject.webgmex',
            projectName: projectName,
            logger: logger,
            gmeConfig: gmeConfig
        };

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
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
            })
            .nodeify(done);
    });

    beforeEach(function (done) {
        testFixture.rimraf('./test-tmp/blob-local-storage', done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    it('should run GenerateAll with no specified config and succeed and return 6 unique artifacts', function (done) {
        var pluginContext = {
                branchName: 'master'
            },
            pluginConfig = {};

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                var hashes = {};
                expect(result.success).to.equal(true);
                expect(result.artifacts.length).to.equal(6);

                result.artifacts.forEach(function (hash) {
                    expect(!hashes[hash]).to.equal(true);
                    hashes[hash] = true;
                });
            })
            .nodeify(done);
    });

    it('should run GenerateAll and pass config parameter of dependency', function (done) {
        var pluginContext = {
                branchName: 'master'
            },
            pluginConfig = {
                _dependencies: {
                    DecoratorGenerator: {
                        pluginConfig: {
                            decoratorName: 'ComingFromGenerateAllPlugin'
                        }
                    }
                }
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.artifacts.length).to.equal(6);

                return Q.allDone(result.artifacts
                    .map(function (hash) {
                        return blobClient.getMetadata(hash);
                    }));
            })
            .then(function (res) {
                var names = res.map(function (metadata) {
                    return metadata.name;
                });

                expect(names).to.include('ComingFromGenerateAllPluginDecorator.zip');
            })
            .nodeify(done);
    });
});