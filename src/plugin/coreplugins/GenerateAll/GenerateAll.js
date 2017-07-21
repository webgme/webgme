/*globals define*/
/*jshint node:true, browser:true*/
/**
 * Plugin for generating AddOns.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:GenerateAll
 */

define([
    'plugin/PluginBase',
    'text!./metadata.json',
    'q'
], function (PluginBase, pluginMetadata, Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    function GenerateAll() {
        // Call base class's constructor
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    GenerateAll.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    GenerateAll.prototype = Object.create(PluginBase.prototype);
    GenerateAll.prototype.constructor = GenerateAll;

    GenerateAll.prototype.main = function (callback) {
        var self = this;

        Q.all(this.getPluginDependencies().map(function (id) {
            return self.invokePlugin(id);
        }))
            .then(function (results) {
                var hasFailures = false;

                results.forEach(function (result) {
                    // Result is instance of InterPluginResult
                    if (result.getSuccess() === false) {
                        hasFailures = true;
                    } else {
                        // Notifications from the invoked plugin are already emitted.

                        // Artifacts are stored on the blob - we want them reported in the final result.
                        result.getArtifacts().forEach(function (metadataHash) {
                            self.result.addArtifact(metadataHash);
                        });

                        // Plugin message are available at getMessages (here we prepend the plugin name)
                        result.getMessages().forEach(function (message) {
                            message.message = result.getPluginName() + ' : ' + message.message;
                            self.result.addMessage(message);
                        });

                        // Attempted saves are not persisted and committed. The messages are accessible.
                        // result.getCommitMessages();
                    }

                    // The instance of the invoked plugin is available at result.pluginInstance
                });

                if (hasFailures) {
                    throw new Error('Called plugin failed with error');
                }

                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                self.result.setSuccess(false);
                self.logger.error(err.stack);
                callback(err, self.result);
            })
            .done();
    };

    return GenerateAll;
});
