/*globals*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('InvalidActiveNode test', function () {
    'use strict';

    var pluginName = 'InvalidActiveNode',
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        core,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../src/plugin/climanager'),
        project,
        projectName = 'plugin_InvalidActiveNode',
        branchName = 'master',
        commitHash,
        gmeAuth;

    before(function (done) {
        var importParam = {
            projectSeed: './seeds/EmptyProject.webgmex',
            projectName: projectName,
            branchName: branchName,
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
                    project.createBranch('b1', commitHash)
                    ]);
            })
            .then(function (res) {
                var persisted;
                core.setRegistry(res[0], 'validPlugins', 'InvalidActiveNode');
                persisted = core.persist(res[0]);
                return project.makeCommit('b1', [commitHash], persisted.rootHash, persisted.objects, 'ff');
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

    it('should fail when plugin is not registered', function (done) {
        var pluginContext = {
                activeNode: '',
                branchName: 'master'
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, null, pluginContext, function (err, result) {
            try {
                expect(err.message).to.contain('Plugin not registered as validPlugin');
                expect(result.success).to.equal(false);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should succeed when plugin is registered', function (done) {
        var pluginContext = {
                activeNode: '',
                branchName: 'b1'
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, null, pluginContext, function (err, result) {
            try {
                expect(err).to.equal(null);
                expect(result.success).to.equal(true);
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});