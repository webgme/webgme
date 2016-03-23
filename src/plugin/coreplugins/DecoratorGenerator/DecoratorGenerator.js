/*globals define*/
/*jshint browser: true, node:true*/
/**
 * Plugin for generating a decorator. Generating a META aware plugin is experimental and the generated code
 * may need some tweaks.
 * @author zhangpn / https://github.com/zhangpn
 * @module CorePlugins:DecoratorGenerator
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'plugin/DecoratorGenerator/DecoratorGenerator/TemplatesInherit/Templates',
    'plugin/DecoratorGenerator/DecoratorGenerator/TemplatesMinimal/Templates',
    'common/util/ejs'
], function (PluginConfig, PluginBase, TEMPLATES_INHERIT, TEMPLATES_MINIMAL, ejs) {
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
            'Circle|Model|Document|Meta|SVG|Default|' +
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
                'generated decorator class.',
                description: 'Unique name for the decorator ("Decorator" will be appended).',
                value: 'SomeName',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'inherit',
                displayName: 'Inherit from ModelEditor',
                description: 'Generates a decorator that inherits from the ModelEditor.',
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