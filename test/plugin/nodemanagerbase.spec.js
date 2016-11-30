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

        libContext = {
            commitHash: null,
            project: null,
            projectName: 'LibAB'
        },

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
                    projectSeed: './seeds/EmptyProject.webgmex',
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
            .then(function () {
                var importParam = {
                    projectSeed: './test/plugin/PluginManagerBase/Lib.A.B.webgmex',
                    projectName: libContext.projectName,
                    branchName: 'master',
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (result) {
                libContext.commitHash = result.commitHash;
                libContext.project = result.project;
                libContext.core = result.core;
                libContext.rootNode = result.rootNode;
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

    it('should initializePlugin with an existing plugin', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig);

        manager.initializePlugin(pluginName)
            .then(function (plugin) {
                expect(typeof plugin.main).to.equal('function');
            })
            .nodeify(done);
    });

    it('should throw exception when initializePlugin on a non-existing plugin', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig);

        manager.initializePlugin(pluginName)
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('should configurePlugin using default project from manager', function (done) {
        var manager = new PluginCliManager(project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: commitHash,
                branchName: branchName
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
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
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
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
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
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
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
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

    it('should executePlugin without specified commitHash', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
                save: false
            },
            context = {
                project: project,
                branchName: branchName
            };

        project.getBranchHash(branchName, function (err, commitHash) {
            expect(err).to.equal(null);

            manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
                expect(err).to.equal(null);

                expect(pluginResult.success).to.equal(true);
                expect(pluginResult.commits[0].commitHash).to.equal(commitHash);
                done();
            });
        });
    });

    it('should executePlugin without specified branchName', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
                save: false
            },
            context = {
                project: project,
                commitHash: commitHash
            };

        project.getBranchHash(branchName, function (err, commitHash) {
            expect(err).to.equal(null);

            manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
                expect(err).to.equal(null);

                expect(pluginResult.success).to.equal(true);
                expect(pluginResult.commits[0].commitHash).to.equal(commitHash);
                done();
            });
        });
    });

    it('should fail to executePlugin without specified branchName nor commitHash', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
                save: false
            },
            context = {
                project: project
            };

        manager.executePlugin(pluginName, pluginConfig, context, function (err/*, pluginResult*/) {
            expect(err).to.contain('Neither commitHash nor branchHash from branch was obtained');

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
        var manager = new PluginCliManager(null, logger, gmeConfig);

        manager.initializePlugin(pluginName)
            .then(function (plugin) {
                manager.runPluginMain(plugin, function (err, pluginResult) {
                    expect(pluginResult.success).to.equal(false);
                    expect(err).to.equal('Plugin is not configured.');
                    done();
                });
            })
            .catch(done);
    });

    it('should configure a plugin twice and use latest configuration', function (done) {
        var manager = new PluginCliManager(project, logger, gmeConfig),
            context = {
                commitHash: commitHash,
                branchName: 'b1'
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;
                return manager.configurePlugin(plugin, {save: false}, context);
            })
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

    it('should fail with error if plugin writeAccessRequired=true and projectAccess.write=false', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: commitHash,
                branchName: branchName,
                project: project
            };

        manager.projectAccess = {
            read: true,
            write: false,
            delete: false
        };

        manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
            try {
                expect(typeof err).to.equal('string');
                expect(typeof pluginResult).to.equal('object');
                expect(pluginResult.success).to.equal(false);
                expect(err).to.contain('Plugin requires write access to the project for execution');
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it('should succeed if plugin writeAccessRequired=false and and projectAccess.write=false', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
                species: 'cat',
                isAnimal: true,
                age: 3
            },
            context = {
                commitHash: commitHash,
                branchName: branchName,
                project: project
            };

        manager.projectAccess = {
            read: true,
            write: false,
            delete: false
        };

        manager.executePlugin('ConfigurationArtifact', pluginConfig, context, function (err, pluginResult) {
            try {
                expect(err).to.equal(null);
                expect(typeof pluginResult).to.equal('object');
                expect(pluginResult.success).to.equal(true);
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it('should fail with error if plugin config.parm.writeAccessRequired=true and projectAccess.write=false',
        function (done) {
            var manager = new PluginCliManager(null, logger, gmeConfig),
                pluginConfig = {
                    age: 10,
                    species: 'cat',
                    isAnimal: true
                },
                context = {
                    commitHash: commitHash,
                    branchName: branchName,
                    project: project
                };

            manager.projectAccess = {
                read: true,
                write: false,
                delete: false
            };

            manager.executePlugin('ConfigurationArtifact', pluginConfig, context, function (err, pluginResult) {
                try {
                    expect(typeof err).to.equal('string');
                    expect(typeof pluginResult).to.equal('object');
                    expect(pluginResult.success).to.equal(false);
                    expect(err).to.contain('User not allowed to modify configuration parameter(s): "age"');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        }
    );

    it('should fail with error if plugin config.parm.readOnly=true',
        function (done) {
            var manager = new PluginCliManager(null, logger, gmeConfig),
                pluginConfig = {
                    isAnimal: false,
                    age: 10
                },
                context = {
                    commitHash: commitHash,
                    branchName: branchName,
                    project: project
                };

            manager.executePlugin('ConfigurationArtifact', pluginConfig, context, function (err, pluginResult) {
                try {
                    expect(typeof err).to.equal('string');
                    expect(typeof pluginResult).to.equal('object');
                    expect(pluginResult.success).to.equal(false);
                    expect(err).to.contain('User not allowed to modify configuration parameter(s): "isAnimal"');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        }
    );

    // Namespaces/Libraries
    // FullQualified META:
    // FCO:     /1
    // a:       /M
    // b:       /V
    // A.FCO:   /T/1
    // A.a:     /T/q
    // A.b:     /T/o
    // A.B.FCO: /T/7/1
    // A.B.a:   /T/7/V
    // A.B.b:   /T/7/R

    it('should configurePlugin without given namespace and set full META', function (done) {
        var manager = new PluginCliManager(libContext.project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: libContext.commitHash
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
            .then(function () {
                expect(plugin.isConfigured).to.equal(true);
                expect(typeof plugin.META).to.equal('object');
                expect(Object.keys(plugin.META).length).to.equal(9);

                expect(plugin.core.getPath(plugin.META['FCO'])).to.equal('/1');
                expect(plugin.core.getPath(plugin.META['a'])).to.equal('/M');
                expect(plugin.core.getPath(plugin.META['b'])).to.equal('/V');

                expect(plugin.core.getPath(plugin.META['A.FCO'])).to.equal('/T/1');
                expect(plugin.core.getPath(plugin.META['A.a'])).to.equal('/T/q');
                expect(plugin.core.getPath(plugin.META['A.b'])).to.equal('/T/o');

                expect(plugin.core.getPath(plugin.META['A.B.FCO'])).to.equal('/T/7/1');
                expect(plugin.core.getPath(plugin.META['A.B.a'])).to.equal('/T/7/V');
                expect(plugin.core.getPath(plugin.META['A.B.b'])).to.equal('/T/7/R');
            })
            .nodeify(done);
    });

    it('should configurePlugin with namespace A set correct META', function (done) {
        var manager = new PluginCliManager(libContext.project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: libContext.commitHash,
                namespace: 'A'
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
            .then(function () {
                expect(plugin.isConfigured).to.equal(true);
                expect(typeof plugin.META).to.equal('object');
                expect(Object.keys(plugin.META).length).to.equal(6);

                expect(plugin.core.getPath(plugin.META['FCO'])).to.equal('/T/1');
                expect(plugin.core.getPath(plugin.META['a'])).to.equal('/T/q');
                expect(plugin.core.getPath(plugin.META['b'])).to.equal('/T/o');

                expect(plugin.core.getPath(plugin.META['B.FCO'])).to.equal('/T/7/1');
                expect(plugin.core.getPath(plugin.META['B.a'])).to.equal('/T/7/V');
                expect(plugin.core.getPath(plugin.META['B.b'])).to.equal('/T/7/R');
            })
            .nodeify(done);
    });

    it('should configurePlugin with namespace A.B set correct META', function (done) {
        var manager = new PluginCliManager(libContext.project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: libContext.commitHash,
                namespace: 'A.B'
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
            .then(function () {
                expect(plugin.isConfigured).to.equal(true);
                expect(typeof plugin.META).to.equal('object');
                expect(Object.keys(plugin.META).length).to.equal(3);

                expect(plugin.core.getPath(plugin.META['FCO'])).to.equal('/T/7/1');
                expect(plugin.core.getPath(plugin.META['a'])).to.equal('/T/7/V');
                expect(plugin.core.getPath(plugin.META['b'])).to.equal('/T/7/R');
            })
            .nodeify(done);
    });

    it('configurePlugin should return error when namespace does not exist', function (done) {
        var manager = new PluginCliManager(libContext.project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: libContext.commitHash,
                namespace: 'A.B.C.D'
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('Given namespace does not exist among the available:');
            })
            .nodeify(done);
    });

    it('should loadNodeMap with all nodes with no start node given', function (done) {
        var manager = new PluginCliManager(libContext.project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: libContext.commitHash,
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
            .then(function () {
                return plugin.loadNodeMap();
            })
            .then(function (nodeMap) {
                expect(typeof nodeMap).to.equal('object');
                expect(nodeMap).to.not.equal(null);
                expect(Object.keys(nodeMap).length).to.equal(12);
            })
            .nodeify(done);
    });

    it('should loadNodeMap with subtree if node given', function (done) {
        var manager = new PluginCliManager(libContext.project, logger, gmeConfig),
            pluginConfig = {},
            context = {
                commitHash: libContext.commitHash,
            },
            plugin;

        manager.initializePlugin(pluginName)
            .then(function (plugin_) {
                plugin = plugin_;

                return manager.configurePlugin(plugin, pluginConfig, context);
            })
            .then(function () {
                plugin.core = libContext.core;
                return libContext.core.loadByPath(libContext.rootNode, '/T');
            })
            .then(function (startNode) {
                return plugin.loadNodeMap(startNode);
            })
            .then(function (nodeMap) {
                expect(typeof nodeMap).to.equal('object');
                expect(nodeMap).to.not.equal(null);
                expect(Object.keys(nodeMap).length).to.equal(8);
            })
            .nodeify(done);
    });
});