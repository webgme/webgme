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

        Q.all([
            self.invokePlugin('AddOnGenerator', {}),
            self.invokePlugin('DecoratorGenerator', {}),
            self.invokePlugin('LayoutGenerator', {}),
            self.invokePlugin('PluginGenerator', {}),
            self.invokePlugin('RestRouterGenerator', {}),
            self.invokePlugin('VisualizerGenerator', {})
        ])
            .then(function (results) {
                var hasFailures = false;

                results.forEach(function (result) {
                    // Result is instances of InterPluginResult
                    if (result.getSuccess() === false) {
                        hasFailures = true;
                    } else {
                        // Messages and notifications from the invoked plugin are already added/emitted.
                        // Artifacts are stored on the blob - we want them reported in the final result.
                        result.getArtifacts().forEach(function (metadataHash) {
                            self.result.addArtifact(metadataHash);
                        });

                        // Since we're the caller we know that these plugins don't save we do not care about commits.
                        // But to get the messages of the attempted saves we can use result.getCommitMessages
                        // and append these to our final save.
                    }
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
