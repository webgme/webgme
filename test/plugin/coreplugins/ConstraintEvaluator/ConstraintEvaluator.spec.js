/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../../_globals');

describe('Plugin ConstraintEvaluator', function () {
    'use strict';

    var pluginName = 'ConstraintEvaluator',
        PluginBase,
        logger,
        gmeConfig,
        storage,
        expect,
        Q = testFixture.Q,
        PluginCliManager,
        project,
        projectName = 'Plugin_ConstraintEvaluator',
        commitHash,
        gmeAuth,
        BlobClient,
        importResult,
        pluginManager;

    before(function (done) {
        PluginBase = testFixture.requirejs('plugin/PluginBase');
        logger = testFixture.logger.fork(pluginName);
        gmeConfig = testFixture.getGmeConfig();
        PluginCliManager = require('../../../../src/plugin/climanager');
        BlobClient = require('../../../../src/server/middleware/blob/BlobClientWithFSBackend');
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
                return Q.allDone([
                    project.createBranch('b1', commitHash),
                    project.createBranch('b2', commitHash),
                    project.createBranch('b3', commitHash),
                    project.createBranch('b4', commitHash),
                ]);
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
                expect(plugin.getName()).to.equal('Constraint Evaluator');
                expect(typeof plugin.getDescription ()).to.equal('string');
                expect(plugin.getConfigStructure() instanceof Array).to.equal(true);
                expect(plugin.getConfigStructure().length).to.equal(2);
            })
            .nodeify(done);
    });

    it('should fail with unexpected mode', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mode: 'SomeOddMode'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            try {
                expect(err.message).to.include('Unexpected mode SomeOddMode');
                expect(result.success).to.equal(false);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should run EvaluateConstraints and report the errors', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mode: 'EvaluateConstraints'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            try {
                expect(err.message).to.include('Constraint evaluation encountered errors!');
                expect(result.success).to.equal(false);
                expect(result.messages.length).to.equal(3);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should run PopulateFromConstraints and update the model', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            pluginConfig = {
                mode: 'PopulateFromConstraints'
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
                return importResult.core.loadRoot(commitObject.root);
            })
            .then(function (rootNode) {
                return importResult.core.loadByPath(rootNode, '/1');
            })
            .then(function (fcoNode) {
                var cNames = importResult.core.getConstraintNames(fcoNode);
                expect(cNames).to.have.members(['NoViolation', 'HasViolation', 'ThrowsException', 'ReturnsError']);
            })
            .nodeify(done);
    });

    it('should run PopulateFromConstraints twice and update the model and clear the first', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b2'
            },
            pluginConfig = {
                mode: 'PopulateFromConstraints',
                clear: true
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                pluginContext.commitHash = result.commits[1].commitHash;
                return Q.ninvoke(project, 'loadObject', pluginContext.commitHash);
            })
            .then(function (commitObject) {
                return importResult.core.loadRoot(commitObject.root);
            })
            .then(function (rootNode) {
                return importResult.core.loadByPath(rootNode, '/1');
            })
            .then(function (fcoNode) {
                var cNames = importResult.core.getConstraintNames(fcoNode);
                expect(cNames).to.have.members(['NoViolation', 'HasViolation', 'ThrowsException', 'ReturnsError']);
                return Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext);
            })
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                return Q.ninvoke(project, 'loadObject', result.commits[1].commitHash);
            })
            .then(function (commitObject) {
                return importResult.core.loadRoot(commitObject.root);
            })
            .then(function (rootNode) {
                return importResult.core.loadByPath(rootNode, '/1');
            })
            .then(function (fcoNode) {
                var cNames = importResult.core.getConstraintNames(fcoNode);
                expect(cNames).to.have.members(['NoViolation', 'HasViolation', 'ThrowsException', 'ReturnsError']);
            })
            .nodeify(done);
    });

    it('should run PopulateFromConstraints twice and update the model and overwrite', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b3'
            },
            pluginConfig = {
                mode: 'PopulateFromConstraints'
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                pluginContext.commitHash = result.commits[1].commitHash;
                return Q.ninvoke(project, 'loadObject', pluginContext.commitHash);
            })
            .then(function (commitObject) {
                return importResult.core.loadRoot(commitObject.root);
            })
            .then(function (rootNode) {
                return importResult.core.loadByPath(rootNode, '/1');
            })
            .then(function (fcoNode) {
                var cNames = importResult.core.getConstraintNames(fcoNode);
                expect(cNames).to.have.members(['NoViolation', 'HasViolation', 'ThrowsException', 'ReturnsError']);
                return Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext);
            })
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                return Q.ninvoke(project, 'loadObject', result.commits[1].commitHash);
            })
            .then(function (commitObject) {
                return importResult.core.loadRoot(commitObject.root);
            })
            .then(function (rootNode) {
                return importResult.core.loadByPath(rootNode, '/1');
            })
            .then(function (fcoNode) {
                var cNames = importResult.core.getConstraintNames(fcoNode);
                expect(cNames).to.have.members(['NoViolation', 'HasViolation', 'ThrowsException', 'ReturnsError']);
            })
            .nodeify(done);
    });

    it('should run PopulateFromConstraints, update the model and then GenerateConstraints', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'b4'
            },
            pluginConfig = {
                mode: 'PopulateFromConstraints'
            },
            blobClient;

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                pluginContext.commitHash = result.commits[1].commitHash;
                pluginConfig.mode = 'GenerateConstraints';

                return Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext);
            })
            .then(function (result) {
                var hash;

                expect(result.success).to.equal(true);
                expect(result.artifacts.length).to.equal(1);
                hash = result.artifacts[0];
                blobClient = new BlobClient(gmeConfig, logger);

                return blobClient.getMetadata(hash);
            })
            .then(function (metadata) {
                expect(typeof metadata.content['Constraints.js']).to.equal('object');
                expect(typeof metadata.content['Constraints.js'].content).to.equal('string');
            })
            .nodeify(done);
    });
});