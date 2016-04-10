/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('PluginGenerator', function () {
    'use strict';

    var logger = testFixture.logger.fork('PluginGeneratorTest'),
        requirejs = testFixture.requirejs,
        expect = testFixture.expect,
        esprima = require('esprima'),
        pluginConfig = {
            pluginID: 'NewPlugin',
            pluginName: 'New Plugin',
            description: '',
            test: true,
            templateType: 'None',// "JavaScript", "Python", "CSharp",
            configStructure: false,
            meta: true
        };

    function isValidJs(testString, logError) {
        var err = null;

        try {
            esprima.parse(testString);
        }
        catch (e) {
            err = e;
            if (logError) {
                logger.error(err.toString());
                logger.error(testString);
            }
        }
        return err;
    }

    function runPlugin (pluginName, configuration, callback) {
        var pluginBasePaths = 'plugin/coreplugins/',
            Plugin = requirejs(pluginBasePaths + pluginName + '/' + pluginName),
            plugin = new Plugin(),
            artifact = {
                addedFiles: {},
                addFile: function (fname, fstr, callback) {
                    this.addedFiles[fname] = fstr;
                    callback(null, 'hash');
                }
            };

        plugin.getCurrentConfig = function () {
            return configuration;
        };

        plugin.createMessage = function (/*node, message, severity*/) {

        };

        plugin.result = {
            success: false,
            artifact: artifact,
            setSuccess: function (value) {
                this.success = value;
            },
            addArtifact: function () {
            }
        };

        plugin.META = {
            FCO: '/1',
            FCOInstance: '/2'
        };

        plugin.core = {
            getPath: function () {
                return '/1';
            }
        };

        plugin.logger = {
            info: function (msg) {
                logger.info(msg);
            },
            debug: function (msg) {
                logger.debug(msg);
            },
            warning: function (msg) {
                logger.warn(msg);
            },
            error: function (msg) {
                logger.error(msg);
            }
        };

        plugin.blobClient = {
            createArtifact: function () {
                return artifact;
            },
            saveAllArtifacts: function (callback) {
                callback(null, ['aHash']);
            }
        };

        plugin.main(callback);
    }



    it ('test esprima', function () {
        expect(isValidJs('var a = {x: 1, y: 2};')).to.equal(null);
        expect(isValidJs('var a = [{x: 1, x: 2};')).to.not.equal(null);
    });

    it ('test getName and version', function () {
        var Plugin = requirejs('plugin/coreplugins/PluginGenerator/PluginGenerator'),
            plugin = new Plugin();
        expect(plugin.getName()).to.equal('Plugin Generator');
        expect(typeof plugin.getVersion()).to.equal('string');
    });

    it ('pluginConfig up to date', function () {
        var Plugin = requirejs('plugin/coreplugins/PluginGenerator/PluginGenerator'),
            plugin = new Plugin(),
            pluginStructure = plugin.getConfigStructure(),
            i;
        expect(Object.keys(pluginConfig).length).to.equal(pluginStructure.length);

        for (i = 0; i < pluginStructure.length; i += 1) {
            expect(pluginConfig.hasOwnProperty(pluginStructure[i].name)).to.equal(true);
            expect(pluginConfig[pluginStructure[i].name]).to.equal(pluginStructure[i].value);
        }
    });

    it('space in pluginID should generate invalid files', function (done) {
        var config = Object.create(pluginConfig);
        config.pluginID = 'I have a space';
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(keys.length).to.equal(4);
            for (i = 0; i < keys.length; i += 1) {
                logger.debug(files[keys[i]]);
                if (keys[i] === 'src/plugins/null/I have a space/meta.js' ||
                    keys[i] === 'test/plugins/null/I have a space/I have a space.spec.js') {

                    expect(isValidJs(files[keys[i]])).to.equal(null);
                } else {
                    expect(isValidJs(files[keys[i]])).not.to.equal(null);
                }
            }
            done();
        });
    });

    it('default settings should generate three valid js files', function (done) {
        runPlugin('PluginGenerator', pluginConfig, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(4);
            for (i = 0; i < keys.length; i += 1) {
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else {
                    logger.debug(files[keys[i]]);
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('configStructure = true should generate three valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.configStructure = true;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(4);
            for (i = 0; i < keys.length; i += 1) {
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else {
                    logger.debug(files[keys[i]]);
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('meta = false should generate two valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.meta = false;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(3);
            for (i = 0; i < keys.length; i += 1) {
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else {
                    logger.debug(files[keys[i]]);
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('meta = false, configStructure = true should generate two valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.meta = false;
        config.configStructure = true;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(3);
            for (i = 0; i < keys.length; i += 1) {
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else {
                    logger.debug(files[keys[i]]);
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('test = false should generate two valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.test = false;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(3);
            for (i = 0; i < keys.length; i += 1) {
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else {
                    logger.debug(files[keys[i]]);
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('templateType = Python should generate four valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.templateType = 'Python';
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(6);
            for (i = 0; i < keys.length; i += 1) {
                logger.debug(files[keys[i]]);
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else if (keys[i] === 'src/plugins/null/NewPlugin/Templates/Python.py.ejs') {
                    expect(isValidJs(files[keys[i]])).to.not.equal(null);
                } else {
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('templateType = Python and meta = false should generate three valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.templateType = 'Python';
        config.meta = false;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(5);
            for (i = 0; i < keys.length; i += 1) {
                logger.debug(files[keys[i]]);
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else if (keys[i] === 'src/plugins/null/NewPlugin/Templates/Python.py.ejs') {
                    expect(isValidJs(files[keys[i]])).to.not.equal(null);
                } else {
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('templateType = JavaScript should generate four valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.templateType = 'JavaScript';
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(6);
            for (i = 0; i < keys.length; i += 1) {
                logger.debug(files[keys[i]]);
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else if (keys[i] === 'src/plugins/null/NewPlugin/Templates/JavaScript.js.ejs') {
                    expect(isValidJs(files[keys[i]])).to.not.equal(null);
                } else {
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });

    it('templateType = CSharp should generate four valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.templateType = 'CSharp';
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            expect(err).to.equal(null);
            expect(keys.length).to.equal(6);
            for (i = 0; i < keys.length; i += 1) {
                logger.debug(files[keys[i]]);
                if (keys[i].indexOf('.json') > -1) {
                    JSON.parse(files[keys[i]]);
                } else if (keys[i] === 'src/plugins/null/NewPlugin/Templates/CSharp.cs.ejs') {
                    expect(isValidJs(files[keys[i]])).to.not.equal(null);
                } else {
                    expect(isValidJs(files[keys[i]])).to.equal(null);
                }
            }
            done();
        });
    });
});
