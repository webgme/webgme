/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../../_globals');

describe('Plugin MetaGMEParadigmImporter', function () {
    'use strict';

    var pluginName = 'MetaGMEParadigmImporter',
        PluginBase = testFixture.requirejs('plugin/PluginBase'),
        BlobFSBackend = require('../../../../src/server/middleware/blob/BlobFSBackend'),
        BlobRunPluginClient = require('../../../../src/server/middleware/blob/BlobRunPluginClient'),
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../../src/plugin/climanager'),
        project,
        projectName = 'Plugin_MetaGMEParadigmImporter',
        commitHash,
        sfBlobHash,
        sfBlobHashFail,
        gmeAuth,
        importResult,
        pluginManager;

    before(function (done) {
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
                return Q.allDone([
                    project.createBranch('b1', commitHash)
                ]);
            })
            .then(function () {
                var blobBackend = new BlobFSBackend(gmeConfig, logger),
                    filePath1 = './test/plugin/coreplugins/MetaGMEParadigmImporter/SF.xmp',
                    filePath2 = './test/plugin/coreplugins/MetaGMEParadigmImporter/SF_fail.xmp',
                    blobClient = new BlobRunPluginClient(blobBackend, logger.fork('Blob'));

                return Q.allDone([
                    Q.ninvoke(blobClient, 'putFile', 'SF.xmp', testFixture.fs.readFileSync(filePath1)),
                    Q.ninvoke(blobClient, 'putFile', 'SF_fail.xmp', testFixture.fs.readFileSync(filePath2))
                ]);
            })
            .then(function (blobHashes) {
                sfBlobHash = blobHashes[0];
                sfBlobHashFail = blobHashes[1];
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

    it('should initialize plugin and get name, version and description', function (done) {
        pluginManager.initializePlugin(pluginName)
            .then(function (plugin) {
                expect(plugin instanceof PluginBase).to.equal(true);
                expect(plugin.getName()).to.equal('MetaGME Paradigm Importer');
                expect(typeof plugin.getDescription ()).to.equal('string');
                expect(plugin.getConfigStructure() instanceof Array).to.equal(true);
                expect(plugin.getConfigStructure().length).to.equal(1);
            })
            .nodeify(done);
    });

    it('should fail with no xmp file provided', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            pluginConfig = {};

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);
            expect(result.success).to.equal(false);
            done();
        });
    });

    it('should fail with error when xmpFile is invalid hash', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            pluginConfig = {
                xmpFile: '88888'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal('Blob hash is invalid');
            expect(result.success).to.equal(false);
            done();
        });
    });

    it('should fail with error when xmpFile is invalid hash', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            pluginConfig = {
                xmpFile: '88888'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal('Blob hash is invalid');
            expect(result.success).to.equal(false);
            done();
        });
    });

    it('should import SF.xmp', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            pluginConfig = {
                xmpFile: sfBlobHash
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                var commitHash;
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                commitHash = result.commits[1].commitHash;
                return Q.ninvoke(project, 'loadObject', commitHash);
            })
            .then(function (commitObject) {
                return Q.ninvoke(importResult.core, 'loadRoot', commitObject.root);
            })
            .then(function (rootNode) {
                var newName = importResult.core.getAttribute(rootNode, 'name');
                expect(newName).to.equal('ROOT');
                return Q.ninvoke(importResult.core, 'loadChildren', rootNode);
            })
            .then(function (children) {
                var i,
                    languageNode;
                for (i = 0; i < children.length; i += 1) {
                    if (importResult.core.getAttribute(children[i], 'name') === 'Language [SF]') {
                        languageNode = children[i];
                        break;
                    }
                }
                expect(typeof languageNode).not.to.equal('undefined');
                expect(importResult.core.getAttribute(languageNode, 'author')).to.equal('An author');
            })
            .nodeify(done);
    });

    it('should fail with error when importing SF_fail.xmp', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            pluginConfig = {
                xmpFile: sfBlobHashFail
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.include('Error: Invalid xmpData: paradigm key does not exist.');
            expect(result.success).to.equal(false);
            done();
        });
    });
});