/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Base', function () {
    'use strict';

    var should = testFixture.should,
        PluginBase = testFixture.requirejs('plugin/PluginBase');

    it('should instantiate PluginBase and have defined properties', function () {
        var pluginBase = new PluginBase();

        should.exist(pluginBase);
        pluginBase.should.have.property('logger');
        pluginBase.should.have.property('blobClient');
        pluginBase.should.have.property('core');
        pluginBase.should.have.property('project');
        pluginBase.should.have.property('projectName');
        pluginBase.should.have.property('branchName');
        pluginBase.should.have.property('commitHash');
        pluginBase.should.have.property('currentHash');
        pluginBase.should.have.property('rootNode');
        pluginBase.should.have.property('activeNode');
        pluginBase.should.have.property('activeSelection');
        pluginBase.should.have.property('META');
        pluginBase.should.have.property('result');
        pluginBase.should.have.property('isConfigured');

        // check default values
        pluginBase.isConfigured.should.be.false;

        pluginBase.should.have.property('main');
        pluginBase.should.have.property('getName');
        pluginBase.should.have.property('getVersion');
        pluginBase.should.have.property('getDescription');
        pluginBase.should.have.property('getConfigStructure');
        pluginBase.should.have.property('updateSuccess');
        pluginBase.should.have.property('updateMETA');
        pluginBase.should.have.property('isMetaTypeOf');
        pluginBase.should.have.property('getMetaType');
        pluginBase.should.have.property('baseIsMeta');
        pluginBase.should.have.property('getCurrentConfig');
        pluginBase.should.have.property('createMessage');
        pluginBase.should.have.property('save');
        pluginBase.should.have.property('initialize');
        pluginBase.should.have.property('configure');
        pluginBase.should.have.property('getDefaultConfig');
        pluginBase.should.have.property('setCurrentConfig');
    });

    it('should throw if main is called', function () {
        var pluginBase = new PluginBase();
        (function () {
            pluginBase.main(function () {});
        }).should.throw();
    });

    it('should throw if getName is called', function () {
        var pluginBase = new PluginBase();
        (function () {
            pluginBase.getName();
        }).should.throw();
    });

    it('should return with 0.1.0 when getVersion is called', function () {
        var pluginBase = new PluginBase();
        pluginBase.getVersion().should.equal('0.1.0');
    });

    it('should return with an empty string when getDescription is called', function () {
        var pluginBase = new PluginBase();
        pluginBase.getDescription().should.equal('');
    });

    it('should return with an empty array when getConfigStructure is called', function () {
        var pluginBase = new PluginBase();
        pluginBase.getConfigStructure().should.deep.equal([]);
    });



});
