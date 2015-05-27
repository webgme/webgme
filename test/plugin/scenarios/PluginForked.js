/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../_globals');

describe('PluginForked', function () {
    'use strict';

    var pluginName = 'PluginForked',
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage = testFixture.getMemoryStorage(logger, gmeConfig),
        expect = testFixture.expect,
        PluginCliManager = require('../../../src/plugin/climanager'),
        project,
        projectName = 'plugin_forked',
        branchName = 'master',
        commitHash;

    before(function (done) {
        storage.openDatabase(done);
    });

    after(function (done) {
        storage.closeDatabase(done);
    });

    beforeEach(function (done) {
        var importParam = {
            projectSeed: './test/plugin/scenarios/plugins/MultipleMainCallbackCalls/project.json',
            projectName: projectName,
            branchName: branchName,
            logger: logger,
            gmeConfig: gmeConfig
        };

        storage.deleteProject({projectName: projectName})
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


    it('should run PluginForked without forking and succeed to save', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: branchName,
                activeNode: '/1'
            },
            pluginConfig = {
                fork: false
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);
            expect(result.commits.length).to.equal(2);
            expect(result.commits[0].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCH);
            expect(result.commits[1].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCH);
            expect(result.commits[1].branchName).to.equal(branchName);
            done();
        });
    });

    it('should run PluginForked with forking and fork', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: branchName,
                activeNode: '/1'
            },
            pluginConfig = {
                fork: true
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);
            expect(result.commits.length).to.equal(2);
            expect(result.commits[0].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCH);
            expect(result.commits[1].status).to.equal(testFixture.STORAGE_CONSTANTS.FORKED);
            expect(result.commits[1].branchName).not.to.equal(branchName);
            done();
        });
    });
});