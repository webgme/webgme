/*globals define*/
/*jshint browser: true, node:true*/
/**
 * Plugin for generating a decorator. Generating a META aware plugin is experimental and the generated code
 * may need some tweaks.
 * @author zhangpn / https://github.com/zhangpn
 * @module CorePlugins:DecoratorGenerator
 */

define([
    'plugin/PluginBase',
    'text!./metadata.json',
    'plugin/DecoratorGenerator/DecoratorGenerator/TemplatesInherit/Templates',
    'plugin/DecoratorGenerator/DecoratorGenerator/TemplatesMinimal/Templates',
    'common/util/ejs'
], function (PluginBase, pluginMetadata, TEMPLATES_INHERIT, TEMPLATES_MINIMAL, ejs) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of DecoratorGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin DecoratorGenerator.
     * @constructor
     */
    function DecoratorGenerator() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    DecoratorGenerator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    DecoratorGenerator.prototype = Object.create(PluginBase.prototype);
    DecoratorGenerator.prototype.constructor = DecoratorGenerator;

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
            filesToAdd = {},
            success,
            artifact;

        if (config.inherit) {
            success = self.renderInheritTemplates(filesToAdd, config);
        } else {
            success = self.renderMinimalTemplates(filesToAdd, config);
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
                self.result.setSuccess(success);
                callback(null, self.result);
            });
        });
    };

    DecoratorGenerator.prototype.renderMinimalTemplates = function (filesToAdd, config) {
        var baseDir = config.decoratorName + 'Decorator/',
            path,
            dataModel = {
                id: config.decoratorName
            },
            templateName;

        for (templateName in TEMPLATES_MINIMAL) {
            if (TEMPLATES_MINIMAL.hasOwnProperty(templateName)) {
                path = templateName.substring(0, templateName.length - '.ejs'.length);
                path = baseDir + path.replace('__ID__', config.decoratorName);
                filesToAdd[path] = ejs.render(TEMPLATES_MINIMAL[templateName], dataModel);
            }
        }

        return true;
    };

    DecoratorGenerator.prototype.renderInheritTemplates = function (filesToAdd, config) {
        var baseDir = config.decoratorName + 'Decorator/',
            path,
            dataModel = {
                id: config.decoratorName
            },
            templateName;

        for (templateName in TEMPLATES_INHERIT) {
            if (TEMPLATES_INHERIT.hasOwnProperty(templateName)) {
                path = templateName.substring(0, templateName.length - '.ejs'.length);
                path = baseDir + path.replace('__ID__', config.decoratorName);
                filesToAdd[path] = ejs.render(TEMPLATES_INHERIT[templateName], dataModel);
            }
        }

        return true;
    };


    return DecoratorGenerator;
});