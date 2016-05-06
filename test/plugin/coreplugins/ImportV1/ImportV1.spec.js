/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../../_globals');

describe('Plugin ImportV1', function () {
    'use strict';

    var pluginName = 'ImportV1',
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
        projectName = 'Plugin_ImportV1',
        commitHash,
        emptyProjectBlobHash,
        activePanelsBlobHash,
        libBlobHash,
        gmeAuth,
        blobClient,
        importResult,
        pluginManager;

    before(function (done) {
        var importParam = {
            projectSeed: './seeds/ActivePanels.webgmex',
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
                    project.createBranch('b1', commitHash),
                    project.createBranch('b2', commitHash),
                    project.createBranch('b3', commitHash)
                ]);
            })
            .then(function () {
                var blobBackend = new BlobFSBackend(gmeConfig, logger),
                    filePath1 = './test/plugin/coreplugins/ImportV1/assets/EmptyProject.json',
                    filePath2 = './test/plugin/coreplugins/ImportV1/assets/ActivePanels.json',
                    filePath3 = './test/plugin/coreplugins/ImportV1/assets/ActivePanelModel_lib.json';
                blobClient = new BlobRunPluginClient(blobBackend, logger.fork('Blob'));

                return Q.allDone([
                    Q.ninvoke(blobClient, 'putFile', 'EmptyProject.json', testFixture.fs.readFileSync(filePath1)),
                    Q.ninvoke(blobClient, 'putFile', 'ActivePanels.json', testFixture.fs.readFileSync(filePath2)),
                    Q.ninvoke(blobClient, 'putFile', 'ActivePanels.json', testFixture.fs.readFileSync(filePath3)),
                ]);
            })
            .then(function (blobHashes) {
                emptyProjectBlobHash = blobHashes[0];
                activePanelsBlobHash = blobHashes[1];
                libBlobHash = blobHashes[2];
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
                expect(plugin.getName()).to.equal('Import from webgme v1');
                expect(typeof plugin.getDescription ()).to.equal('string');
                expect(plugin.getConfigStructure() instanceof Array).to.equal(true);
                expect(plugin.getConfigStructure().length).to.equal(2);
            })
            .nodeify(done);
    });

    it('should fail with no file provided during ImportProject', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                type: 'ImportProject'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err.message).to.include('No file provided.');
            expect(result.success).to.equal(false);
            done();
        });
    });

    it('should fail with unexpected type', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                type: 'SomeOddType'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err.message).to.include('Unexpected type SomeOddType');
            expect(result.success).to.equal(false);
            done();
        });
    });

    it('should fail with error when file is invalid hash during ImportProject', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                file: '8888',
                type: 'ImportProject'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err.message).to.equal('Requested object does not exist: 8888');
            expect(result.success).to.equal(false);
            done();
        });
    });

    it('should ImportProject EmptyProject into Active Panels', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            pluginConfig = {
                file: emptyProjectBlobHash,
                type: 'ImportProject'
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
                expect(children.length).to.equal(1);
            })
            .nodeify(done);
    });

    it('should ImportLibrary ActivePanelModel_lib.json into Active Panels', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b2'
            },
            pluginConfig = {
                file: libBlobHash,
                type: 'ImportLibrary'
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
                expect(children.length).to.equal(4);
            })
            .nodeify(done);
    });

    it('should UpdateLibrary ActivePanelModel_lib.json into Active Panels', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b3',
                activeNode: '/1303043463'
            },
            pluginConfig = {
                file: libBlobHash,
                type: 'UpdateLibrary'
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
                var didMatch = false;
                expect(children.length).to.equal(3);
                children.map(function (child) {
                    if (importResult.core.getPath(child) === '/1303043463') {
                        didMatch = importResult.core.getAttribute(child, 'name') === 'ModelUpdated';
                    }
                });
                expect(didMatch).to.equal(true);
            })
            .nodeify(done);
    });

    it('UpdateLibrary should fail on project json', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: ''
            },
            pluginConfig = {
                file: emptyProjectBlobHash,
                type: 'UpdateLibrary'
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.equal('Root path in json is empty string and exported ' +
                    'from a root - use ImportProject.');
            })
            .nodeify(done);
    });

    it('ImportLibrary should fail on project json', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: ''
            },
            pluginConfig = {
                file: emptyProjectBlobHash,
                type: 'ImportLibrary'
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.equal('Root path in json is empty string and exported ' +
                    'from a root - use ImportProject.');
            })
            .nodeify(done);
    });

    it('ImportProject should fail on lib json', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: ''
            },
            pluginConfig = {
                file: libBlobHash,
                type: 'ImportProject'
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.equal('Root path in json is not empty string and not exported ' +
                    'from a root node - use Import/UpdateLibrary');
            })
            .nodeify(done);
    });
});