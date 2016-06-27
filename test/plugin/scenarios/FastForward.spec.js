/*globals*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('FastForward test', function () {
    'use strict';

    var pluginName = 'FastForward',
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        core,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../src/plugin/climanager'),
        project,
        projectName = 'plugin_FastForward',
        commitHash,
        gmeAuth;

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
            .then(function (importResult) {
                project = importResult.project;
                commitHash = importResult.commitHash;
                core = importResult.core;
                return Q.allDone([
                    testFixture.loadRootNodeFromCommit(project, core, commitHash),
                    project.createBranch('b1', commitHash),
                    project.createBranch('b2', commitHash)
                    ]);
            })
            .then(function (res) {
                var persisted;
                core.setAttribute(res[0], 'name', 'Root2');
                persisted = core.persist(res[0]);
                return project.makeCommit('b2', [commitHash], persisted.rootHash, persisted.objects, 'ff');
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

    it('should succeed when no changes made', function (done) {
        var pluginContext = {
                activeNode: '',
                branchName: 'b1',
                commitHash: commitHash
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, null, pluginContext, function (err, result) {
            try {
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should fast-forward and succeed when "changes made"', function (done) {
        var pluginContext = {
                activeNode: '',
                branchName: 'b2',
                commitHash: commitHash,
                activeSelection: ['/1']
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, null, pluginContext, function (err, result) {
            try {
                expect(result.success).to.equal(true);
                expect(result.commits.length).to.equal(2);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should fail when not running from a branch', function (done) {
        var pluginContext = {
                activeNode: '',
                commitHash: commitHash
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, null, pluginContext, function (err, result) {
            try {
                expect(result.success).to.equal(false);
                expect(result.error).to.include('Invalid argument, data.branchName');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should fail when running on non-existing branch', function (done) {
        var pluginContext = {
                activeNode: '',
                branchName: 'doesNotExist',
                commitHash: commitHash
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, null, pluginContext, function (err, result) {
            try {
                expect(result.success).to.equal(false);
                expect(result.error).to.include('Branch does not exist');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

});