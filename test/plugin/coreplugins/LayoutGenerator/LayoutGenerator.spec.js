/*jshint node:true, mocha:true*/
/**
 * @author brollb / https://github.com/brollb
 */

var testFixture = require('../../../_globals');

describe('LayoutGenerator', function () {
    'use strict';

    var logger = testFixture.logger.fork('LayoutGeneratorTest'),
        requirejs = testFixture.requirejs,
        expect = testFixture.expect,
        path = testFixture.path,
        esprima = require('esprima'),
        pluginConfig = {
            layoutID: 'MyCustomLayout'
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

    describe('LayoutID', function() {
        it('should not allow spaces', function() {
            var Plugin = requirejs('plugin/coreplugins/LayoutGenerator/LayoutGenerator'),
                plugin = new Plugin(),
                pluginStructure = plugin.getConfigStructure(),
                regex = new RegExp(pluginStructure[0].regex),
                invalidName = 'I have spaces';

            expect(regex.test(invalidName)).to.equal(false);
        });
    });

    it('should have a string for getName', function() {
        var Plugin = requirejs('plugin/coreplugins/LayoutGenerator/LayoutGenerator'),
            plugin = new Plugin();
        expect(plugin.getName()).to.equal('Layout Generator');
    });

    it('should have a string for getVersion', function() {
        var Plugin = requirejs('plugin/coreplugins/LayoutGenerator/LayoutGenerator'),
            plugin = new Plugin();
        expect(typeof plugin.getVersion()).to.equal('string');
    });

    it('pluginConfig up to date', function () {
        var Plugin = requirejs('plugin/coreplugins/LayoutGenerator/LayoutGenerator'),
            plugin = new Plugin(),
            pluginStructure = plugin.getConfigStructure();
        expect(Object.keys(pluginConfig).length).to.equal(pluginStructure.length);

        for (var i = pluginStructure.length; i--;) {
            expect(pluginConfig.hasOwnProperty(pluginStructure[i].name)).to.equal(true);
            expect(pluginConfig[pluginStructure[i].name]).to.equal(pluginStructure[i].value);
        }
    });

    it('should run successfully with default config', function () {
        runPlugin('LayoutGenerator', pluginConfig, function (err, result) {
            expect(result.success).to.equal(true);
        });
    });

    describe('Generated Files', function() {
        var files,
            basePath = 'src/client/js/',
            layoutID = 'CheckingMyFiles',
            filePaths = {
                js: 'Layouts/' + layoutID + '/' + layoutID + '.js',
                config: 'Layouts/' + layoutID + '/' + layoutID + 'Config.json',
                template: 'Layouts/' + layoutID + '/templates/' + layoutID + '.html'
            };

        before(function(done) {
            var config = Object.create(pluginConfig);
            config.layoutID = layoutID ;
            runPlugin('LayoutGenerator', config, function (err, result) {
                files = result.artifact.addedFiles;
                expect(result.success).to.equal(true);
                done();
            });
        });

        // Check every file listed in filePaths
        var types = Object.keys(filePaths);
        var testFile = function(type, shortPath) {
                var filePath = basePath+shortPath,
                    isJs = path.extname(filePath) === '.js';

                it('should generate a '+type.toLowerCase()+' file', function () {

                    expect(files[filePath]).to.not.equal(undefined);
                });

                // Extra check only if it is a .js file
                if (isJs) {
                    it('should be valid js', function () {
                        expect(isValidJs(files[filePath])).to.equal(null);
                    });
                }
            };

        for (var i = types.length; i--;) {
            describe(types[i], testFile.bind(null, types[i], filePaths[types[i]]));
        }
    });

});
