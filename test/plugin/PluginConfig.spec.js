/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Config', function () {
    'use strict';

    var should = testFixture.should,
        PluginConfig = testFixture.requirejs('plugin/PluginConfig');

    it('should instantiate PluginConfig and have defined properties', function () {
        var pluginConfig = new PluginConfig();

        should.exist(pluginConfig);
        pluginConfig.should.have.property('serialize');
    });

    it('should instantiate PluginConfig with a serialized object', function () {
        var pluginConfig = new PluginConfig({key1: 22});

        should.exist(pluginConfig);
        pluginConfig.should.have.property('key1');
    });

    it('should serialize a PluginConfig', function () {
        var pluginConfig = new PluginConfig({key1: 22});

        should.exist(pluginConfig);
        pluginConfig.serialize().should.deep.equal({key1: 22});
    });
});