/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

var testFixture = require('../../../_globals');

describe('AddOnGenerator', function () {
    'use strict';

    var logger = testFixture.logger.fork('AddOnGeneratorTest'),
        requirejs = testFixture.requirejs,
        expect = testFixture.expect,
        path = testFixture.path,
        esprima = require('esprima'),
        pluginConfig = {
            addOnId: 'NewAddOn',
            addOnName: 'New AddOn',
            description: '',
            queryParamsStructure: false
        };

    var isValidJs = function(testString, logError) {
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
    };

    var runPlugin = function (pluginName, configuration, callback) {
        var pluginBasePaths = 'plugin/coreplugins/',
            Plugin = requirejs(pluginBasePaths + pluginName + '/' + pluginName),
            plugin = new Plugin(),
            artifact = {
                addedFiles: {},
                addFile: function (fname, fstr, callback) {
                    this.addedFiles[fname] = fstr;
                    callback(null, 'hash');
                },
                addFiles: function(files, cb) {
                    for (var name in files) {
                        this.addedFiles[name] = files[name];
                    }
                    cb(null, 'hash');
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
    };

    describe('AddOnID', function() {
        it('should not allow spaces', function() {
            var Plugin = requirejs('plugin/coreplugins/AddOnGenerator/AddOnGenerator'),
                plugin = new Plugin(),
                pluginStructure = plugin.getConfigStructure(),
                regex = new RegExp(pluginStructure[0].regex),
                invalidName = 'I have spaces';

            expect(regex.test(invalidName)).to.equal(false);
        });
    });

    it('should have a string for getName', function() {
        var Plugin = requirejs('plugin/coreplugins/AddOnGenerator/AddOnGenerator'),
            plugin = new Plugin();
        expect(plugin.getName()).to.equal('AddOn Generator');
    });

    it('should have a string for getVersion', function() {
        var Plugin = requirejs('plugin/coreplugins/AddOnGenerator/AddOnGenerator'),
            plugin = new Plugin();
        expect(typeof plugin.getVersion()).to.equal('string');
    });

    it('pluginConfig up to date', function () {
        var Plugin = requirejs('plugin/coreplugins/AddOnGenerator/AddOnGenerator'),
            plugin = new Plugin(),
            pluginStructure = plugin.getConfigStructure();

        expect(Object.keys(pluginConfig).length).to.equal(pluginStructure.length);

        for (var i = pluginStructure.length; i--;) {
            expect(pluginConfig.hasOwnProperty(pluginStructure[i].name)).to.equal(true);
            expect(pluginConfig[pluginStructure[i].name]).to.equal(pluginStructure[i].value);
        }
    });

    it('should run successfully with default config', function () {
        runPlugin('AddOnGenerator', pluginConfig, function (err, result) {
            expect(result.success).to.equal(true);
        });
    });

    describe('Generated File(s)', function() {
        var files;
        before(function(done) {
            var config = Object.create(pluginConfig);
            config.addOnId += '2';
            runPlugin('AddOnGenerator', config, function (err, result) {
                files = result.artifact.addedFiles;
                expect(result.success).to.equal(true);
                done();
            });
        });

        it('should generate a src file', function () {
            var srcFile = files['src/addOns/null/NewAddOn2/NewAddOn2.js'];
            expect(srcFile).to.not.equal(undefined);
        });

        // issue 640
        it('should have correct path for AddOnBase', function () {
            var srcFile = files['src/addOns/null/NewAddOn2/NewAddOn2.js'];
            expect(srcFile.indexOf('\'addon/AddOnBase\'')).to.not.equal(-1);
        });

        // Extra check only if it is a .js file
        it('should be valid js', function () {
            expect(isValidJs(files['src/addOns/null/NewAddOn2/NewAddOn2.js'])).to.equal(null);
        });

    });

});
