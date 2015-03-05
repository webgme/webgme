/*globals console*/
/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('PluginGenerator', function () {
    'use strict';

    var should = testFixture.should,
        requirejs = testFixture.requirejs,
        esprima = require('esprima'),
        pluginConfig = {
            pluginID: 'NewPlugin',
            pluginName: 'New Plugin',
            description: '',
            test: true,
            templateType: 'None',// "JavaScript", "Python", "CSharp",
            configStructure: false,
            core: false
        };

    function isValidJs(testString, logError) {
        var err = null;

        try {
            esprima.parse(testString);
        }
        catch (e) {
            err = e;
            if (logError) {
                console.error(err.toString());
                console.error(testString);
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
            info: function () {
                //console.log(msg)
            },
            debug: function () {
                //console.log(msg)
            },
            warning: function () {
                //console.warn(msg)
            },
            error: function (msg) {
                console.error(msg);
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
        should.equal(isValidJs('var a = {x: 1, y: 2};', true), null);
        should.not.equal(isValidJs('var a = [{x: 1, x: 2};', false), null);
    });

    it ('test getName and version', function () {
        var Plugin = requirejs('plugin/coreplugins/PluginGenerator/PluginGenerator'),
            plugin = new Plugin();
        should.equal(plugin.getName(), 'Plugin Generator');
        should.equal(plugin.getVersion(), '0.1.1');
    });

    it ('pluginConfig up to date', function () {
        var Plugin = requirejs('plugin/coreplugins/PluginGenerator/PluginGenerator'),
            plugin = new Plugin(),
            pluginStructure = plugin.getConfigStructure(),
            i;
        should.equal(Object.keys(pluginConfig).length, pluginStructure.length);

        for (i = 0; i < pluginStructure.length; i += 1) {
            should.equal(pluginConfig.hasOwnProperty(pluginStructure[i].name), true);
            should.equal(pluginConfig[pluginStructure[i].name], pluginStructure[i].value);
        }
    });

    it('space in pluginID should generate invalid files', function (done) {
        var config = Object.create(pluginConfig);
        config.pluginID = 'I have a space';
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            should.equal(err, null);
            should.equal(keys.length, 3);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                if (keys[i] === 'src/plugins/null/I have a space/meta.js') {
                    should.equal(isValidJs(files[keys[i]], true), null);
                } else {
                    should.not.equal(isValidJs(files[keys[i]]), null);
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

            should.equal(err, null);
            should.equal(keys.length, 3);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                should.equal(isValidJs(files[keys[i]], true), null);
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

            should.equal(err, null);
            should.equal(keys.length, 3);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                should.equal(isValidJs(files[keys[i]], true), null);
            }
            done();
        });
    });

    it('core = true should generate three valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.core = true;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            should.equal(err, null);
            should.equal(keys.length, 3);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                should.equal(isValidJs(files[keys[i]], true), null);
            }
            done();
        });
    });

    it('core, configStructure = true should generate three valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.core = true;
        config.configStructure = true;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            should.equal(err, null);
            should.equal(keys.length, 3);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                should.equal(isValidJs(files[keys[i]], true), null);
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

            should.equal(err, null);
            should.equal(keys.length, 2);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                should.equal(isValidJs(files[keys[i]], true), null);
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

            should.equal(err, null);
            should.equal(keys.length, 5);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                if (keys[i] === 'src/plugins/null/NewPlugin/Templates/Python.py.ejs') {
                    should.not.equal(isValidJs(files[keys[i]]), null);
                } else {
                    should.equal(isValidJs(files[keys[i]], null), null);
                }
            }
            done();
        });
    });

    it('templateType = Python and core = true should generate four valid js files', function (done) {
        var config = Object.create(pluginConfig);
        config.templateType = 'Python';
        config.core = true;
        runPlugin('PluginGenerator', config, function (err, result) {
            var files = result.artifact.addedFiles,
                keys = Object.keys(files),
                i;

            should.equal(err, null);
            should.equal(keys.length, 5);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                if (keys[i] === 'src/plugins/null/NewPlugin/Templates/Python.py.ejs') {
                    should.not.equal(isValidJs(files[keys[i]]), null);
                } else {
                    should.equal(isValidJs(files[keys[i]], true), null);
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

            should.equal(err, null);
            should.equal(keys.length, 5);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                if (keys[i] === 'src/plugins/null/NewPlugin/Templates/JavaScript.js.ejs') {
                    should.not.equal(isValidJs(files[keys[i]]), null);
                } else {
                    should.equal(isValidJs(files[keys[i]], null), null);
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

            should.equal(err, null);
            should.equal(keys.length, 5);
            for (i = 0; i < keys.length; i += 1) {
                //console.log(files[keys[i]]);
                if (keys[i] === 'src/plugins/null/NewPlugin/Templates/CSharp.cs.ejs') {
                    should.not.equal(isValidJs(files[keys[i]]), null);
                } else {
                    should.equal(isValidJs(files[keys[i]], null), null);
                }
            }
            done();
        });
    });
});
