/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Plugin mainly used for testing.
 * @author lattmann / https://github.com/lattmann
 * @module CorePlugins:MinimalWorkingExample
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json'
], function (PluginConfig, PluginBase, pluginMetadata) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of MinimalWorkingExample.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin MinimalWorkingExample.
     * @constructor
     */
    function MinimalWorkingExample() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;

        // we do not know the meta types, will be populated during run time
        this.metaTypes = {};
    }

    MinimalWorkingExample.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    MinimalWorkingExample.prototype = Object.create(PluginBase.prototype);
    MinimalWorkingExample.prototype.constructor = MinimalWorkingExample;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warn,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(Error, plugin.PluginResult)} callback - the result callback
     */
    MinimalWorkingExample.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            currentConfiguration = self.getCurrentConfig();
        self.updateMETA(self.metaTypes);
        // Using the logger.
        self.logger.debug('This is a debug message.');
        self.logger.info('This is an info message.');
        self.logger.warn('This is a warning message.');
        self.logger.error('This is an error message.');

        // Using the coreAPI to create an object.
        var newNode = self.core.createNode({parent: self.rootNode, base: self.META.FCO});
        self.core.setAttribute(newNode, 'name', 'My new obj');
        self.core.setRegistry(newNode, 'position', {x: 70, y: 70});

        if (self.isMetaTypeOf(newNode, self.metaTypes.FCO)) {
            self.logger.info('The new node is an FCO');
        }

        var newNodeMetaType = self.getMetaType(newNode);
        self.logger.info('The new node is a(n) ' + self.core.getAttribute(newNodeMetaType, 'name'));

        if (self.baseIsMeta(newNode)) {
            self.logger.info('The new node\'s base type is on the meta sheet.');
        }

        // This will save the changes. If you don't want to save;
        // exclude self.save and call callback directly from this scope.
        if (currentConfiguration.save === true) {
            self.save('added obj', function (err, status) {
                if (err) {
                    callback(err, self.result);
                    return;
                }
                self.logger.info('saved returned with status', status);

                if (currentConfiguration.shouldFail) {
                    //self.result.setError('Failed on purpose.');
                    callback(new Error('Failed on purpose.'), self.result);
                } else {
                    self.result.setSuccess(true);
                    callback(null, self.result);
                }
            });
        } else {
            if (currentConfiguration.shouldFail) {
                self.result.setError('Failed on purpose.');
                callback(new Error('Failed on purpose.'), self.result);
            } else {
                self.result.setSuccess(true);
                callback(null, self.result);
            }
        }

    };

    return MinimalWorkingExample;
});