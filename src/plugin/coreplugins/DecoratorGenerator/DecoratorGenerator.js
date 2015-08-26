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
    };

    // Prototypal inheritance from PluginBase.
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
        return 'Generates all necessary files for a dsml decorator.';
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
            baseDir = 'src/decorators/' + self.projectName + 'Decorator/',
            filesToAdd = {},
            metaNodeName,
            metaNodes = [],
            templateName,
            filePath,
            artifact;

        for (metaNodeName in self.META) {
            if (self.META.hasOwnProperty(metaNodeName)) {
                metaNodes.push({
                    name: metaNodeName,
                    path: self.core.getPath(self.META[metaNodeName])
                });
            }
        }
        metaNodes = metaNodes.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });

        for (templateName in TEMPLATES) {
            if (TEMPLATES.hasOwnProperty(templateName)) {
                filePath = templateName.substring(0, templateName.length - 4);
                filePath = baseDir + filePath.replace('Template', self.projectName);
                if (self.endsWith(filePath, 'META.js')) {
                    filesToAdd[filePath] = ejs.render(TEMPLATES[templateName], {
                        name: self.projectName,
                        metaNodes: metaNodes
                    });
                } else {
                    filesToAdd[filePath] = ejs.render(TEMPLATES[templateName], {
                        decorator: {
                            name: self.projectName
                        }
                    });
                }
            }
        }
        artifact = self.blobClient.createArtifact('decoratorFiles');
        artifact.addFiles(filesToAdd, function (err /*, hashes*/) {
            if (err) {
                callback(err, self.result);
                return;
            }
            artifact.save(function (err, hash) {
                if (err) {
                    return callback(err, self.result);
                }
                self.result.addArtifact(hash);
                self.result.setSuccess(true);
                callback(null, self.result);
            });
        });
    };

    DecoratorGenerator.prototype.endsWith = function (str, ending) {
        var lastIndex = str.lastIndexOf(ending);
        return (lastIndex !== -1) && (lastIndex + ending.length === str.length);
    };

    return DecoratorGenerator;
});