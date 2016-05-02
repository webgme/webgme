/*jshint node:true, mocha:true, expr:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Base', function () {
    'use strict';

    var should = testFixture.should,
        gmeConfig = testFixture.getGmeConfig(),
        PluginBase = testFixture.requirejs('plugin/PluginBase'),
        PluginConfig = testFixture.requirejs('plugin/PluginConfig');

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
            pluginBase.main(function () {
            });
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

    it('should initialize PluginBase without a logger', function () {
        var pluginBase = new PluginBase();
        pluginBase.initialize(null /* logger */, null /* blobClient */, gmeConfig);
        pluginBase.logger.should.equal(console);
    });

    it('should initialize PluginBase with a custom logger', function () {
        var pluginBase = new PluginBase(),
            logger = {
                debug: function (/*msg*/) {
                    // debug message
                }
            };
        pluginBase.initialize(logger, null /* blobClient */, gmeConfig);
        pluginBase.logger.should.equal(logger);
    });

    it('should configure PluginBase', function () {
        var pluginBase = new PluginBase(),
            logger = {
                debug: function (/*msg*/) {
                    // debug message
                }
            };
        pluginBase.initialize(logger, null /* blobClient */, gmeConfig);
        pluginBase.configure({META_BY_NS: {'': {}}});
        pluginBase.isConfigured.should.be.true;
    });

    it('should configure with commitHash PluginBase', function () {
        var pluginBase = new PluginBase(),
            logger = {
                debug: function (/*msg*/) {
                    // debug message
                }
            };
        pluginBase.initialize(logger, null /* blobClient */, gmeConfig);
        pluginBase.configure({
            branchName: 'master',
            commitHash: 'abcdefg12345',
            META_BY_NS: {'': {}}
        });
        pluginBase.commitHash.should.equal('abcdefg12345');
        pluginBase.branchName.should.equal('master');
        pluginBase.branchHash.should.equal('abcdefg12345');
    });

    it('should update success PluginBase', function () {
        var pluginBase = new PluginBase(),
            logger = {
                debug: function (/*msg*/) {
                    // debug message
                }
            };
        pluginBase.initialize(logger, null /* blobClient */, gmeConfig);
        pluginBase.configure({META_BY_NS: {'': {}}});

        // setup for this test
        pluginBase.result.success = true;

        pluginBase.updateSuccess(true, 'ok');
        pluginBase.result.getSuccess().should.be.true;
        pluginBase.updateSuccess(false, 'not ok');
        pluginBase.result.getSuccess().should.be.false;
        pluginBase.updateSuccess(true, 'should remain false');
        pluginBase.result.getSuccess().should.be.false;
    });


    it('should update META', function () {
        var pluginBase = new PluginBase(),
            generatedMETA = {
                'FCO': '/1',
                'element1': '/2'
            };

        pluginBase.META = {
            'FCO': '/1/2/3',
            'element2': '/444'
        };

        pluginBase.updateMETA(generatedMETA);

        pluginBase.META.should.deep.equal({
            'FCO': '/1/2/3',
            'element2': '/444'
        });

        generatedMETA.should.deep.equal({
            'FCO': '/1/2/3',
            'element1': '/2',
            'element2': '/444'
        });

    });

    it('should get set current config', function () {
        var pluginBase = new PluginBase(),
            config = {'key1': 42};

        pluginBase.setCurrentConfig(config);
        pluginBase.getCurrentConfig().should.equal(config);
    });


    it('should get default custom config', function () {
        var pluginBase = new PluginBase(),
            defaultConfig;

        // emulate plugin override
        pluginBase.getConfigStructure = function () {
            return [{
                'name': 'logChildrenNames',
                'displayName': 'Log Children Names',
                'description': '',
                'value': true, // this is the 'default config'
                'valueType': 'boolean',
                'readOnly': false
            }, {
                'name': 'logLevel',
                'displayName': 'Logger level',
                'description': '',
                'value': 'info',
                'valueType': 'string',
                'valueItems': [
                    'debug',
                    'info',
                    'warn',
                    'error'
                ],
                'readOnly': false
            }, {
                'name': 'maxChildrenToLog',
                'displayName': 'Maximum children to log',
                'description': 'Set this parameter to blabla',
                'value': 4,
                'minValue': 1,
                'valueType': 'number',
                'readOnly': false
            }];
        };

        defaultConfig = pluginBase.getDefaultConfig();

        defaultConfig.should.be.instanceOf(PluginConfig);

        // getDefaultConfig returns with a PluginConfig object we should serialize it.
        defaultConfig.serialize().should.deep.equal({
            'logChildrenNames': true,
            'logLevel': 'info',
            'maxChildrenToLog': 4
        });
    });


});
