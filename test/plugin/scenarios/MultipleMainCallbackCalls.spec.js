/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../_globals');

describe('MultipleMainCallbackCalls', function () {
    'use strict';

    var pluginName = 'MultipleMainCallbackCalls',
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../src/plugin/climanager'),
        project,
        projectName = 'plugin_mmcc',
        branchName = 'master',
        commitHash,
        gmeAuth;

    before(function (done) {
        var importParam = {
            projectSeed: 'seeds/EmptyProject.webgmex',
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
                done();
            })
            .catch(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    it('should run MultipleMainCallbackCalls and return error at second cb', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: branchName
            },
            cnt = 0,
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, null, pluginContext, function (err, result) {
            if (cnt === 0) {
                expect(err).to.equal(null);
                expect(result.success).to.equal(true);
            } else if (cnt === 1) {
                expect(err).to.equal('The main callback is being called more than once!');
                expect(result.success).to.equal(false);
            } else {
                done(new Error('Main callback should only be called at most twice from pluginManager'));
                return;
            }
            cnt += 1;
            if (cnt === 2) {
                done();
            }
        });
    });
});