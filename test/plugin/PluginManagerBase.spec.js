/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Manager Base', function () {
    'use strict';

    var should = testFixture.should,
        PluginManagerBase = testFixture.requirejs('plugin/PluginManagerBase'),
        PluginGenerator = testFixture.requirejs('plugin/PluginGenerator/PluginGenerator/PluginGenerator'),
        Storage = testFixture.Storage;

    it('should instantiate PluginManagerBase and have defined properties', function () {
        var pluginManagerBase,
            pluginManagerConfig = {
                PluginGenerator: PluginGenerator
            };

        pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig);

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

        pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig);

        (function () {
            pluginManagerBase.initialize(null, null, null);
        }).should.not.throw();
    });

    it('should get plugin by name', function () {
        var pluginManagerBase,
            pluginManagerConfig = {
                PluginGenerator: PluginGenerator
            };

        pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig);

        pluginManagerBase.initialize(null, null, null);
        pluginManagerBase.getPluginByName('PluginGenerator').should.equal(PluginGenerator);
    });

    describe.skip('Plugin execution', function () {
        var storage,
            project,
            core,
            root,
            commit,
            baseCommit,
            rootHash;

        before(function (done) {
            testFixture.importProject({
                filePath: './test/asset/intraPersist.json',
                projectName: 'PluginManagerBase'
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

        it('should execute plugin', function () {
            var pluginManagerBase,
                pluginManagerConfig = {
                    PluginGenerator: PluginGenerator
                },
                managerConfiguration = {

                };

            pluginManagerBase = new PluginManagerBase(new Storage(), core, pluginManagerConfig);

            pluginManagerBase.initialize(null, null, null);
            pluginManagerBase.executePlugin('PluginGenerator', managerConfiguration, function (err, result) {

            });
        });
    });

});