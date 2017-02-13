/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../_globals');

describe('Run PluginForked', function () {
    'use strict';

    var pluginName = 'PluginForked',
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../src/plugin/climanager'),
        project,
        projectName = 'plugin_forked',
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
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    beforeEach(function (done) {
        var importParam = {
            projectSeed: 'seeds/EmptyProject.webgmex',
            projectName: projectName,
            logger: logger,
            gmeConfig: gmeConfig
        };

        storage.deleteProject({projectId: projectId})
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


    it('without external commit should succeed to save to master.', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                activeNode: '/1',
                branchName: 'master'
            },
            pluginConfig = {
                fork: false
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);
            expect(result.commits.length).to.equal(2);
            expect(result.commits[0].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCED);
            expect(result.commits[1].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCED);
            expect(result.commits[1].branchName).to.equal('master');

            storage.getBranches({projectId: projectId})
                .then(function (branches) {
                    expect(typeof branches).to.equal('object');

                    expect(branches.master).to.equal(result.commits[1].commitHash);

                    done();
                })
                .catch(done);
        });
    });

    it('with external forking commit should save to random fork branch.', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/1'
            },
            pluginConfig = {
                fork: true
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);
            expect(result.commits.length).to.equal(2);
            expect(result.commits[0].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCED);
            expect(result.commits[1].status).to.equal(testFixture.STORAGE_CONSTANTS.FORKED);
            expect(result.commits[1].branchName).not.to.equal('master');
            storage.getBranches({projectId: projectId})
                .then(function (branches) {
                    expect(typeof branches).to.equal('object');

                    var index,
                        branchNames = Object.keys(branches);
                    expect(branchNames.length).to.equal(2);

                    index = branchNames.indexOf('master');
                    if (index === 0) {
                        expect(branches[branchNames[1]]).to.equal(result.commits[1].commitHash);
                    } else if (index === 1) {
                        expect(branches[branchNames[0]]).to.equal(result.commits[1].commitHash);
                    } else {
                        throw new Error('master was not among branches');
                    }

                    done();
                })
                .catch(done);
        });
    });

    it('with external forking commit and given forkName should fork to forkName branch.', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/1'
            },
            pluginConfig = {
                fork: true,
                forkName: 'fork1'
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);
            expect(result.commits.length).to.equal(2);
            expect(result.commits[0].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCED);
            expect(result.commits[1].status).to.equal(testFixture.STORAGE_CONSTANTS.FORKED);
            expect(result.commits[1].branchName).to.equal('fork1');

            storage.getBranches({projectId: projectId})
                .then(function (branches) {
                    expect(typeof branches).to.equal('object');
                    expect(branches.fork1).to.equal(result.commits[1].commitHash);

                    done();
                })
                .catch(done);
        });
    });

    it('with external forking commit and given forkName already exist should return error.', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master',
                activeNode: '/1'
            },
            pluginConfig = {
                fork: true,
                forkName: 'fork2'
            },
            pluginManager = new PluginCliManager(project, logger, gmeConfig);

        storage.createBranch({projectId: projectId, branchName: 'fork2', hash: commitHash})
            .then(function (result) {
                expect(typeof result).to.equal('object');
                expect(result.status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCED);

                pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
                    expect(err.message).to.equal('Plugin got forked from "master". And got forked from "fork2" too.');
                    expect(result.commits.length).to.equal(2);
                    expect(result.commits[0].status).to.equal(testFixture.STORAGE_CONSTANTS.SYNCED);
                    expect(result.commits[1].status).to.equal(testFixture.STORAGE_CONSTANTS.FORKED);
                    expect(result.commits[1].branchName).to.equal(null);
                    done();
                });
            })
            .catch(done);

    });
});