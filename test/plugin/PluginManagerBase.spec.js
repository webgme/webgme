/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Base', function () {
    'use strict';

    var should = testFixture.should,
        PluginManagerBase = testFixture.requirejs('plugin/PluginManagerBase'),
        PluginGenerator = testFixture.requirejs('plugin/PluginGenerator/PluginGenerator/PluginGenerator');

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
            pluginManagerConfig = {
                PluginGenerator: PluginGenerator
            };

        pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig);

        (function () {
            pluginManagerBase.initialize(null, null, null);
        }).should.not.throw();
    });

    it('should initialize PluginManagerBase with configCallback', function () {
        var pluginManagerBase,
            pluginManagerConfig = {
                PluginGenerator: PluginGenerator
            },
            configCallback = function () {

            };

        pluginManagerBase = new PluginManagerBase(null, null, pluginManagerConfig);

        (function () {
            pluginManagerBase.initialize(null, configCallback, null);
        }).should.not.throw();
    });
});