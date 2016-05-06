/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../../_globals');

describe('Plugin MergeExample', function () {
    'use strict';

    var pluginName = 'MergeExample',
        PluginBase = testFixture.requirejs('plugin/PluginBase'),
        logger = testFixture.logger.fork(pluginName),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        PluginCliManager = require('../../../../src/plugin/climanager'),
        project,
        projectName = 'Plugin_MergeExample',
        commitHash,
        commitHashRoot1,
        commitHashRoot2,
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
                    project.createBranch('b1', commitHash),
                    project.createBranch('b2', commitHash),
                    project.createBranch('Root1', commitHash),
                    project.createBranch('Root2', commitHash),
                ]);
            })
            .then(function () {
                // Change name on root and makeCommit into Root1
                var persisted;
                importResult.core.setAttribute(importResult.rootNode, 'name', 'Root1');
                persisted = importResult.core.persist(importResult.rootNode);
                return project.makeCommit('Root1', [commitHash], persisted.rootHash, persisted.objects, 'Root1');
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                expect(result.hash).not.to.equal(commitHash);
                commitHashRoot1 = result.hash;
                // Load the original root
                return Q.ninvoke(importResult.core, 'loadRoot', importResult.rootHash);
            })
            .then(function (rootNode) {
                // Change name on root and makeCommit into Root2
                var persisted;
                importResult.core.setAttribute(rootNode, 'name', 'Root2');
                persisted = importResult.core.persist(rootNode);
                return project.makeCommit('Root2', [commitHash], persisted.rootHash, persisted.objects, 'Root2');
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                expect(result.hash).not.to.equal(commitHash);
                expect(result.hash).not.to.equal(commitHashRoot1);
                commitHashRoot2 = result.hash;
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
                expect(plugin.getName()).to.equal('Merge Example');
                expect(typeof plugin.getDescription ()).to.equal('string');
                expect(plugin.getConfigStructure() instanceof Array).to.equal(true);
                expect(plugin.getConfigStructure().length).to.equal(4);
            })
            .nodeify(done);
    });

    it('should merge an identical branches into an existing branch', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mergeFrom: 'b1',
                mergeTo: 'b2'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);

            project.getBranches()
                .then(function (branches) {
                    expect(branches.b1).to.equal(commitHash);
                    expect(branches.b2).to.equal(commitHash);
                })
                .nodeify(done);
        });
    });

    it('should merge two identical branches into a new branch', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mergeFrom: 'b1',
                mergeTo: 'b2',
                createNewBranch: true,
                newBranchName: 'newBranchFromTwoIdentical'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);

            project.getBranches()
                .then(function (branches) {
                    expect(branches.b1).to.equal(commitHash);
                    expect(branches.b2).to.equal(commitHash);
                    expect(branches.newBranchFromTwoIdentical).to.equal(commitHash);
                })
                .nodeify(done);
        });
    });

    it('should fast-forward when "from" has more changes into a new branch', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mergeFrom: 'Root1',
                mergeTo: 'b1',
                createNewBranch: true,
                newBranchName: 'fastForwardFrom'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);

            project.getBranches()
                .then(function (branches) {
                    expect(branches.b1).to.equal(commitHash);
                    expect(branches.Root1).to.equal(commitHashRoot1);
                    expect(branches.fastForwardFrom).to.equal(commitHashRoot1);
                })
                .nodeify(done);
        });
    });

    it('should point new branch to "to" when "to" has more changes than "from"', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mergeFrom: 'b1',
                mergeTo: 'Root1',
                createNewBranch: true,
                newBranchName: 'fastForwardTo'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);

            project.getBranches()
                .then(function (branches) {
                    expect(branches.b1).to.equal(commitHash);
                    expect(branches.Root1).to.equal(commitHashRoot1);
                    expect(branches.fastForwardTo).to.equal(commitHashRoot1);
                })
                .nodeify(done);
        });
    });

    it('should point new branch to "to" when "to" has more changes than "from" when to is commitHash', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mergeFrom: 'b1',
                mergeTo: commitHashRoot1,
                createNewBranch: true,
                newBranchName: 'fastForwardToCommitHash'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);

            project.getBranches()
                .then(function (branches) {
                    expect(branches.b1).to.equal(commitHash);
                    expect(branches.Root1).to.equal(commitHashRoot1);
                    expect(branches.fastForwardToCommitHash).to.equal(commitHashRoot1);
                })
                .nodeify(done);
        });
    });

    it('should use mergeFrom name when conflict (Root1)', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mergeFrom: 'Root1',
                mergeTo: 'Root2',
                createNewBranch: true,
                newBranchName: 'conflict1'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);

            project.getBranches()
                .then(function (branches) {
                    expect(branches.Root1).to.equal(commitHashRoot1);
                    expect(branches.Root2).to.equal(commitHashRoot2);
                    expect(branches.conflict1).to.not.equal(commitHashRoot1);
                    expect(branches.conflict1).to.not.equal(commitHashRoot2);
                    expect(branches.conflict1).to.not.equal(commitHash);

                    return Q.ninvoke(project, 'loadObject', branches.conflict1);
                })
                .then(function (commitObject) {
                    return Q.ninvoke(importResult.core, 'loadRoot', commitObject.root);
                })
                .then(function (rootNode) {
                    var newName = importResult.core.getAttribute(rootNode, 'name');
                    expect(newName).to.equal('Root1');
                })
                .nodeify(done);
        });
    });

    it('should use mergeFrom name when conflict (Root2)', function (done) {
        var pluginContext = {
                commitHash: commitHash,
                branchName: 'master'
            },
            pluginConfig = {
                mergeFrom: 'Root2',
                mergeTo: 'Root1',
                createNewBranch: true,
                newBranchName: 'conflict2'
            };

        pluginManager.executePlugin(pluginName, pluginConfig, pluginContext, function (err, result) {
            expect(err).to.equal(null);

            project.getBranches()
                .then(function (branches) {
                    expect(branches.Root1).to.equal(commitHashRoot1);
                    expect(branches.Root2).to.equal(commitHashRoot2);
                    expect(branches.conflict2).to.not.equal(commitHashRoot1);
                    expect(branches.conflict2).to.not.equal(commitHashRoot2);
                    expect(branches.conflict2).to.not.equal(commitHash);

                    return Q.ninvoke(project, 'loadObject', branches.conflict2);
                })
                .then(function (commitObject) {
                    return Q.ninvoke(importResult.core, 'loadRoot', commitObject.root);
                })
                .then(function (rootNode) {
                    var newName = importResult.core.getAttribute(rootNode, 'name');
                    expect(newName).to.equal('Root2');
                })
                .nodeify(done);
        });
    });
});