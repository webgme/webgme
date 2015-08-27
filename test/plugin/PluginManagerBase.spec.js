/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Manager Base', function () {
    'use strict';

    var WebGME = testFixture.WebGME,
        PluginManagerBase = testFixture.requirejs('plugin/PluginManagerBase'),
        PluginGenerator = testFixture.requirejs('plugin/PluginGenerator/PluginGenerator/PluginGenerator'),
        MinimalWorkingExample = testFixture.requirejs(
            'plugin/MinimalWorkingExample/MinimalWorkingExample/MinimalWorkingExample'),
        logger = testFixture.logger;

    describe('plugin manager API', function () {

        var gmeConfig = testFixture.getGmeConfig(),
            should = testFixture.should;

        it('should instantiate PluginManagerBase and have defined properties', function () {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                };

            pluginManagerBase = new PluginManagerBase(null, null, logger, pluginManagerConfig, gmeConfig);

            should.exist(pluginManagerBase);
            pluginManagerBase.should.have.property('logger');
            pluginManagerBase.should.have.property('_Core');
            pluginManagerBase.should.have.property('_storage');
            pluginManagerBase.should.have.property('_plugins');
            pluginManagerBase.should.have.property('_pluginConfigs');

            pluginManagerBase.should.have.property('initialize');
            pluginManagerBase.should.have.property('getPluginByName');
            pluginManagerBase.should.have.property('getPluginContext');
            pluginManagerBase.should.have.property('executePlugin');
        });

        it('should initialize PluginManagerBase', function () {
            var pluginManagerBase,
                pluginManagerConfig = {};

            pluginManagerBase = new PluginManagerBase(null, null, logger, pluginManagerConfig, gmeConfig);

            (function () {
                pluginManagerBase.initialize(null, null, null);
            }).should.not.throw();
        });

        it('should get plugin by name', function () {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                };

            pluginManagerBase = new PluginManagerBase(null, null, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.getPluginByName('PluginGenerator').should.equal(PluginGenerator);
        });

    });

    describe('Plugin execution', function () {
        var storage,
            project,
            core,
            root,
            commit,
            baseCommit,
            rootHash,

            rimraf = testFixture.rimraf,
            BlobClient = testFixture.BlobClient,
            server,
            bcParam = {},
            blobClient,

            gmeAuth,

            gmeConfig = testFixture.getGmeConfig();

        gmeConfig.server.https.enable = false;

        before(function (done) {
            // we have to set the config here
            bcParam.serverPort = gmeConfig.server.port;
            bcParam.server = '127.0.0.1';
            bcParam.httpsecure = gmeConfig.server.https.enable;
            server = testFixture.WebGME.standaloneServer(gmeConfig);
            server.start(function () {

                blobClient = new BlobClient(bcParam);

                testFixture.clearDBAndGetGMEAuth(gmeConfig, 'PluginManagerBase')
                    .then(function (gmeAuth_) {
                        gmeAuth = gmeAuth_;
                        storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                        return storage.openDatabase();
                    })
                    .then(function () {

                        testFixture.importProject(storage, {
                            projectSeed: './test/plugin/PluginManagerBase/project.json',
                            projectName: 'PluginManagerBase',
                            gmeConfig: gmeConfig,
                            logger: logger
                        }, function (err, result) {
                            if (err) {
                                done(err);
                                return;
                            }
                            project = result.project;
                            core = result.core;
                            root = result.rootNode;
                            commit = result.commitHash;
                            baseCommit = result.commitHash;
                            rootHash = core.getHash(root);
                            done();
                        });
                    });

            });
        });

        beforeEach(function (done) {
            rimraf('./test-tmp/blob-storage', function (err) {
                if (err) {
                    done(err);
                    return;
                }
                done();
            });
        });

        after(function (done) {
            server.stop(done);
        });

        it.skip('should execute plugin MinimalWorkingExample on commit and save', function (done) {
            // Plugins in the client are associated with a branch.
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator,
                    MinimalWorkingExample: MinimalWorkingExample
                },
                managerConfiguration = {
                    commit: commit,
                    activeSelection: [],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('MinimalWorkingExample', managerConfiguration, function (err/*, result*/) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
        });

        it('should execute plugin MinimalWorkingExample on branch and save', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator,
                    MinimalWorkingExample: MinimalWorkingExample
                },
                managerConfiguration = {
                    branchName: 'master',
                    activeSelection: [],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            project.getBranchHash('master')
                .then(function (branchHash) {
                    testFixture.expect(branchHash).to.not.equal(null);
                    managerConfiguration.commit = branchHash;
                    pluginManagerBase.executePlugin('MinimalWorkingExample', managerConfiguration, function (err/*, result*/) {
                        // TODO: do proper check.
                        if (err) {
                            done(new Error(err));
                            return;
                        }
                        //console.log(result);
                        done();
                    });
                })
                .catch(done);
        });

        it('should execute plugin PluginGenerator', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: commit,
                    branchName: 'master',
                    activeSelection: [],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err/*, result*/) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
        });

        it('should execute plugin when branchName is given', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    branchName: 'master',
                    activeSelection: [],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            project.getBranchHash('master')
                .then(function (branchHash) {
                    testFixture.expect(branchHash).to.not.equal(null);
                    managerConfiguration.commit = branchHash;
                    pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err/*, result*/) {
                        // TODO: do proper check.
                        if (err) {
                            done(new Error(err));
                            return;
                        }
                        //console.log(result);
                        done();
                    });
                })
                .catch(done);
        });

        it('should fail to execute plugin when invalid branchName is given', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    branchName: 'does not exist',
                    activeSelection: [],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err/*, result*/) {
                // TODO: do proper check.
                if (err.indexOf('cannot find branch') > -1) {
                    done();
                    return;
                }
                //console.log(result);
                done(new Error('should have failed with cannot find branch'));
            });
        });

        it('should execute plugin when root is in active selection', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: commit,
                    branchName: 'master',
                    activeSelection: [''],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err/*, result*/) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
        });

        it('should execute plugin when root is active node', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    branchName: 'master',
                    commit: commit,
                    activeNode: '',
                    activeSelection: [''],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err/*, result*/) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
        });


        it('should execute plugin with error, when active node is not found', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: commit,
                    activeNode: 'does not exist',
                    branchName: 'master',
                    activeSelection: [''],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err/*, result*/) {
                // TODO: do proper check.
                if (err.indexOf('unable to load') > -1) {
                    done();
                    return;
                }
                done(new Error('should have failed to load node'));
            });
        });


        it('should execute plugin, when active selection (node) is not found', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: commit,
                    activeSelection: ['does not exist'],
                    blobClient: blobClient,
                    branchName: 'master'
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err/*, result*/) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
        });


        it('should execute plugin with error, when commit is invalid hash', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: 'does not exist',
                    activeSelection: [''],
                    blobClient: blobClient,
                    branchName: 'master'
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
                testFixture.expect(err).to.not.equal(null);
                testFixture.expect(err.message)
                    .to.equal('Invalid argument, data.before is not a number nor a valid hash.');

                done();
            });
        });

        it('should execute plugin with error, when commit does not exist', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: '#doesnotexist',
                    activeSelection: [''],
                    blobClient: blobClient,
                    branchName: 'master'
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, logger, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
                testFixture.expect(err).to.not.equal(null);
                testFixture.expect(err.message)
                    .to.include('object does not exist #doesnotexist');

                done();
            });
        });
    });

});