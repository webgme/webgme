/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('climanager', function () {
    'use strict';

    var pluginName = 'MinimalWorkingExample',
        logger = testFixture.logger.fork('climanager'),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../src/plugin/climanager'),
        project,
        projectName = 'cliManagerProject',
        branchName = 'master',
        projectId = testFixture.projectName2Id(projectName),
        commitHash,

        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: './seeds/EmptyProject.json',
                    projectName: projectName,
                    branchName: branchName,
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                project = importResult.project;
                commitHash = importResult.commitHash;
                return project.createBranch('b1', commitHash);
            })
            .then(function () {
                return project.createBranch('b2', commitHash);
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

    it('should initializePlugin with an existing plugin', function () {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            plugin = manager.initializePlugin(pluginName);
        expect(typeof plugin.main).to.equal('function');
    });

    it('should throw exception when initializePlugin on a non-existing plugin', function () {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            initBogus = function () {
                manager.initializePlugin('bogusPlugin');
            };
        expect(initBogus).to.throw(Error, 'Tried loading');
    });

    it('should configurePlugin using default project from manager', function (done) {
        var manager = new PluginCliManager(project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: commitHash,
                branchName: branchName
            },
            plugin = manager.initializePlugin(pluginName);

        manager.configurePlugin(plugin, pluginConfig, context)
            .then(function () {
                expect(plugin.isConfigured).to.equal(true);
                expect(plugin.project).to.equal(project);
            })
            .nodeify(done);
    });

    it('should configurePlugin using project passed via context', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: commitHash,
                branchName: branchName,
                project: project
            },
            plugin = manager.initializePlugin(pluginName);

        manager.configurePlugin(plugin, pluginConfig, context)
            .then(function () {
                expect(plugin.isConfigured).to.equal(true);
                expect(plugin.project).to.equal(project);
            })
            .nodeify(done);
    });

    it('should fail configurePlugin with no default project in manager and no project in context ', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: commitHash,
                branchName: branchName
            },
            plugin = manager.initializePlugin(pluginName);

        manager.configurePlugin(plugin, pluginConfig, context)
            .then(function () {
                done(new Error('Should have failed to configure with no project'));
            })
            .catch(function (err) {
                expect(typeof err).to.equal('object');
                expect(err.message).to.contain('project is not an instance of ProjectInterface');
                expect(plugin.isConfigured).to.equal(false);
                done();
            })
            .done();
    });

    it('should initialize, configure and run main', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
                save: false
            },
            context = {
                project: project,
                commitHash: commitHash,
                branchName: branchName
            },
            plugin = manager.initializePlugin(pluginName);

        manager.configurePlugin(plugin, pluginConfig, context)
            .then(function () {
                expect(plugin.isConfigured).to.equal(true);
                expect(plugin.project).to.equal(project);
                manager.runPluginMain(plugin, function (err, pluginResult) {
                    expect(err).to.equal(null);
                    expect(pluginResult.success).to.equal(true);
                    done();
                });
            })
            .catch(done);
    });

    it('should executePlugin', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
                save: false
            },
            context = {
                project: project,
                commitHash: commitHash,
                branchName: branchName
            };

        manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
            expect(err).to.equal(null);
            expect(pluginResult.success).to.equal(true);
            done();
        });
    });

    it('should fail executePlugin with pluginResult when no default project in manager and no project in context',
        function (done) {
            var manager = new PluginCliManager(null, logger, gmeConfig),
                pluginConfig = {},
                context = {
                    commitHash: commitHash,
                    branchName: branchName
                };

            manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
                expect(typeof err).to.equal('string');
                expect(typeof pluginResult).to.equal('object');
                expect(pluginResult.success).to.equal(false);
                expect(err).to.contain('project is not an instance of ProjectInterface');
                done();
            });
        }
    );

    it('should fail with error during runPluginMain if plugin not configured', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            plugin = manager.initializePlugin(pluginName);

        manager.runPluginMain(plugin, function (err, pluginResult) {
            expect(pluginResult.success).to.equal(false);
            expect(err).to.equal('Plugin is not configured.');

            done();
        });
    });

    it('should configure a plugin twice and use latest configuration', function (done) {
        var manager = new PluginCliManager(project, logger, gmeConfig),
            context = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            plugin = manager.initializePlugin(pluginName);

        manager.configurePlugin(plugin, {save: false}, context)
            .then(function () {
                var newContext = {
                    commitHash: commitHash,
                    branchName: 'b2'
                };
                expect(plugin.isConfigured).to.equal(true);
                expect(plugin.project).to.equal(project);
                expect(plugin.branchName).to.equal('b1');
                expect(plugin.getCurrentConfig().save).to.equal(false);

                return manager.configurePlugin(plugin, {save: true}, newContext);
            })
            .then(function () {
                expect(plugin.isConfigured).to.equal(true);
                expect(plugin.project).to.equal(project);
                expect(plugin.branchName).to.equal('b2');
                expect(plugin.getCurrentConfig().save).to.equal(true);

                manager.runPluginMain(plugin, function (err, pluginResult) {
                    var newCommitHash;
                    expect(pluginResult.success).to.equal(true);
                    expect(pluginResult.commits.length).to.equal(2);
                    newCommitHash = pluginResult.commits[1].commitHash;

                    project.getBranchHash('b1')
                        .then(function (b1Hash) {
                            expect(b1Hash).to.equal(commitHash);
                            return project.getBranchHash('b2');
                        })
                        .then(function (b2Hash) {
                            expect(b2Hash).to.equal(newCommitHash);
                        })
                        .nodeify(done);
                });
            })
            .catch(done);
    });
});