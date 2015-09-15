/*globals define*/
/*jshint browser: true, node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'plugin/DecoratorGenerator/DecoratorGenerator/Templates/Templates',
    'common/util/ejs'
], function (PluginConfig, PluginBase, TEMPLATES, ejs) {
    'use strict';

    /**
     * Initializes a new instance of DecoratorGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin DecoratorGenerator.
     * @constructor
     */
    var DecoratorGenerator = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.jsRegExpStr = '^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void' +
            '|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|' +
            'static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|' +
            'arguments|interface|protected|implements|instanceof)$)[a-zA-Z_$][0-9a-zA-Z_$]*';
    };

    // Prototypical inheritance from PluginBase.
    DecoratorGenerator.prototype = Object.create(PluginBase.prototype);
    DecoratorGenerator.prototype.constructor = DecoratorGenerator;

    /**
     * Gets the name of the DecoratorGenerator.
     * @returns {string} The name of the plugin.
     * @public
     */
    DecoratorGenerator.prototype.getName = function () {
        return 'Decorator Generator';
    };

    /**
     * Gets the semantic version (semver.org) of the DecoratorGenerator.
     * @returns {string} The version of the plugin.
     * @public
     */
    DecoratorGenerator.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the description of the DecoratorGenerator.
     * @returns {string} The description of the plugin.
     * @public
     */
    DecoratorGenerator.prototype.getDescription = function () {
        return 'Generates all necessary files for a decorator.';
    };

    /**
     * Gets the configuration structure for the DecoratorGenerator.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    DecoratorGenerator.prototype.getConfigStructure = function () {
        var self = this;
        return [
            {
                name: 'decoratorName',
                displayName: 'Name of decorator',
                regex: self.jsRegExpStr,
                regexMessage: 'No spaces and special characters allowed. This value is used as the name of the ' +
                'generated plugin class.',
                description: 'Unique name for the decorator ("Decorator" will be appended).',
                value: 'SomeName',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'meta',
                displayName: 'Generate META',
                description: 'Generates a static listing of the meta objects to facilitate coding (experimental).',
                value: false,
                valueType: 'boolean',
                readOnly: false
            }
        ];
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    DecoratorGenerator.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            config = self.getCurrentConfig(),
            baseDir = 'src/decorators/' + config.decoratorName + 'Decorator/',
            filesToAdd = {},
            metaNodes,
            templateName,
            filePath,
            artifact;

        if (config.meta) {
            metaNodes = this.getMetaNodesInfo();
            if (metaNodes === false) {
                self.result.setSuccess(false);
                callback(null, self.result);
                return;
            }
        }

        for (templateName in TEMPLATES) {
            if (TEMPLATES.hasOwnProperty(templateName)) {
                filePath = templateName.substring(0, templateName.length - 4);
                filePath = baseDir + filePath.replace('Template', config.decoratorName);
                if (self.endsWith(filePath, 'META.js')) {
                    if (config.meta) {
                        filesToAdd[filePath] = ejs.render(TEMPLATES[templateName], {
                            decorator: {
                                name: config.decoratorName
                            },
                            config: config,
                            metaNodes: metaNodes
                        });
                    }
                } else {
                    filesToAdd[filePath] = ejs.render(TEMPLATES[templateName], {
                        decorator: {
                            name: config.decoratorName
                        },
                        config: config
                    });
                }
            }
        }

        artifact = self.blobClient.createArtifact(config.decoratorName + 'Decorator');
        artifact.addFiles(filesToAdd, function (err /*, hashes*/) {
            if (err) {
                callback(err, self.result);
                return;
            }

            artifact.save(function (err, hash) {
                if (err) {
                    callback(err, self.result);
                    return;
                }

                self.result.addArtifact(hash);
                self.result.setSuccess(true);
                callback(null, self.result);
            });
        });
    };

    DecoratorGenerator.prototype.getMetaNodesInfo = function () {
        var metaNodes = [],
            success = true,
            regExp = new RegExp(this.jsRegExpStr),
            metaNodeName;

        for (metaNodeName in this.META) {
            if (this.META.hasOwnProperty(metaNodeName)) {
                if (regExp.test(metaNodeName)) {
                    metaNodes.push({
                        name: metaNodeName,
                        path: this.core.getPath(this.META[metaNodeName])
                    });
                } else {
                    success = false,
                    this.createMessage(this.META[metaNodeName], 'Cannot generate META helper class. Name of meta-' +
                        'node is invalid JavaScript "' + metaNodeName + '".');
                }
            }
        }

        if (success === false) {
            return false;
        } else {
            return metaNodes.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });
        }
    };

    DecoratorGenerator.prototype.endsWith = function (str, ending) {
        var lastIndex = str.lastIndexOf(ending);
        return (lastIndex !== -1) && (lastIndex + ending.length === str.length);
    };

    return DecoratorGenerator;
});