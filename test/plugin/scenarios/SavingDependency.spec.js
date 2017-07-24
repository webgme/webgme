/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('Saving dependency plugin', function () {
    'use strict';

    var pluginName = 'SavingDependency',
        projectName = 'SavingDependencyPluginProj',
        Q = testFixture.Q,
        blobClient,
        gmeConfig,
        storage,
        expect,
        project,
        core,
        commitHash,
        gmeAuth,
        importResult,
        pluginManager;

    before(function (done) {
        var logger = testFixture.logger.fork(pluginName),
            PluginCliManager = require('../../../src/plugin/climanager'),
            BlobClient = require('../../../src/server/middleware/blob/BlobClientWithFSBackend');

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
                core = importResult.core;

                pluginManager = new PluginCliManager(project, logger, gmeConfig);

                return Q.allDone([
                    project.createBranch('b1', commitHash),
                    project.createBranch('b2', commitHash),
                    project.createBranch('b3', commitHash),
                    project.createBranch('b4', commitHash),
                    project.createBranch('b5', commitHash),
                    project.createBranch('b6', commitHash)
                    ]);
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

    it('should run SavingDependency with no specified config and save the model', function (done) {
        var pluginContext = {
                branchName: 'b1'
            },
            pluginConfig = {};

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.artifacts.length).to.equal(7);
                expect(result.commits.length).to.equal(2);
                return testFixture.loadRootNodeFromCommit(project, core, result.commits[1].commitHash);
            })
            .then(function (rootNode) {
                expect(core.getChildrenPaths(rootNode).length).to.equal(2);
            })
            .nodeify(done);
    });

    it('should run SavingDependency and not update model if save is false', function (done) {
        var pluginContext = {
                branchName: 'b2'
            },
            pluginConfig = {
                save: false
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.artifacts.length).to.equal(7);
                expect(result.commits.length).to.equal(1);
                return project.getBranchHash('b2');
            })
            .then(function (branchHash) {
                return testFixture.loadRootNodeFromCommit(project, core, branchHash);
            })
            .then(function (rootNode) {
                expect(core.getChildrenPaths(rootNode).length).to.equal(1);
            })
            .nodeify(done);
    });

    it('should run SavingDependency and not update model if save is false for called plugin', function (done) {
        var pluginContext = {
                branchName: 'b3'
            },
            pluginConfig = {
                save: true,
                _dependencies: {
                    MinimalWorkingExample: {
                        pluginConfig: {
                            save: false
                        }
                    }
                }
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.artifacts.length).to.equal(7);
                expect(result.commits.length).to.equal(1);
                return project.getBranchHash('b3');
            })
            .then(function (branchHash) {
                return testFixture.loadRootNodeFromCommit(project, core, branchHash);
            })
            .then(function (rootNode) {
                expect(core.getChildrenPaths(rootNode).length).to.equal(1);
            })
            .nodeify(done);
    });

    it('should run SavingDependency and pass config parameter of dependency from different callers', function (done) {
        var pluginContext = {
                branchName: 'b4'
            },
            pluginConfig = {
                _dependencies: {
                    DecoratorGenerator: {
                        pluginConfig: {
                            decoratorName: 'NameTopLevel'
                        }
                    },
                    GenerateAll: {
                        pluginConfig: {
                            _dependencies: {
                                DecoratorGenerator: {
                                    pluginConfig: {
                                        decoratorName: 'NameNestedLevel'
                                    }
                                }
                            }
                        }
                    }
                }
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
                expect(result.artifacts.length).to.equal(7);

                return Q.allDone(result.artifacts
                    .map(function (hash) {
                        return blobClient.getMetadata(hash);
                    }));
            })
            .then(function (res) {
                var names = res.map(function (metadata) {
                    return metadata.name;
                });

                expect(names).to.include('NameTopLevelDecorator.zip');
                expect(names).to.include('NameNestedLevelDecorator.zip');
            })
            .nodeify(done);
    });

    it('should run SavingDependency and use explicitly from plugin passed config param', function (done) {
        var pluginContext = {
                branchName: 'b5'
            },
            pluginConfig = {
                minimalShouldFail: false,
                _dependencies: {
                    MinimalWorkingExample: {
                        pluginConfig: {
                            shouldFail: true // It passes shouldFail: false so this should be ignored
                        }
                    }
                }
            };

        Q.ninvoke(pluginManager, 'executePlugin', pluginName, pluginConfig, pluginContext)
            .then(function (result) {
                expect(result.success).to.equal(true);
            })
            .nodeify(done);
    });
});