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
        MinimalWorkingExample = testFixture.requirejs('plugin/MinimalWorkingExample/MinimalWorkingExample/MinimalWorkingExample'),
        Storage = testFixture.Storage;

    describe('plugin manager API', function () {

        var gmeConfig = testFixture.getGmeConfig(),
            should = testFixture.should;

        it('should instantiate PluginManagerBase and have defined properties', function () {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                };

            pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig, gmeConfig);

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

            pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig, gmeConfig);

            (function () {
                pluginManagerBase.initialize(null, null, null);
            }).should.not.throw();
        });

        it('should get plugin by name', function () {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                };

            pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig, gmeConfig);

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
            Artifact = testFixture.requirejs('blob/Artifact'),
            server,
            bcParam = {},
            blobClient,

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

                testFixture.importProject({
                    filePath: './test/asset/intraPersist.json',
                    projectName: 'PluginManagerBase',
                    gmeConfig: gmeConfig
                }, function (err, result) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage = result.storage;
                    project = result.project;
                    core = result.core;
                    root = result.root;
                    commit = result.commitHash;
                    baseCommit = result.commitHash;
                    rootHash = core.getHash(root);
                    done();
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

        it('should execute plugin MinimalWorkingExample on commit and save', function (done) {
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

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('MinimalWorkingExample', managerConfiguration, function (err, result) {
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

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('MinimalWorkingExample', managerConfiguration, function (err, result) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
        });

        it('should execute plugin PluginGenerator', function (done) {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: commit,
                    activeSelection: [],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
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

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
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

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
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
                    activeSelection: [''],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
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
                    // FIXME: for some reason branchName fails
                    commit: commit,
                    activeNode: '',
                    activeSelection: [''],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
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
                    activeSelection: [''],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
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
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
                // TODO: do proper check.
                if (err) {
                    done(new Error(err));
                    return;
                }
                //console.log(result);
                done();
            });
        });


        it('should execute plugin with error, when commit does not exist', function () {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {
                    commit: 'does not exist',
                    activeSelection: [''],
                    blobClient: blobClient
                };

            pluginManagerBase = new PluginManagerBase(project, WebGME.core, pluginManagerConfig, gmeConfig);

            pluginManagerBase.initialize(null, null, null);
            (function () {
                pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {
                    //// TODO: do proper check, this function should not throw exceptions!
                });
            }).should.throw(Error);
        });
    });

});