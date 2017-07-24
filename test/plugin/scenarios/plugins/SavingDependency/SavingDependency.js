/*globals define*/
/*jshint node:true, browser:true*/

if (typeof define === 'undefined') {

} else {
    define([
        'plugin/PluginConfig',
        'plugin/PluginBase',
        'text!./metadata.json',
        'q'
    ], function (PluginConfig,
                 PluginBase,
                 pluginMetadata,
                 Q) {
        'use strict';

        pluginMetadata = JSON.parse(pluginMetadata);
        var SavingDependency = function () {
            // Call base class' constructor.
            PluginBase.call(this);
            this.pluginMetadata = pluginMetadata;
        };

        SavingDependency.metadata = pluginMetadata;

        SavingDependency.prototype = Object.create(PluginBase.prototype);
        SavingDependency.prototype.constructor = SavingDependency;

        SavingDependency.prototype.main = function (callback) {
            var self = this,
                config = self.getCurrentConfig();

            Q.all(this.getPluginDependencies().map(function (id) {
                var cfg = {};
                if (id === 'MinimalWorkingExample') {
                    cfg.pluginConfig = {shouldFail: config.minimalShouldFail};
                }
                return self.invokePlugin(id, cfg);
            }))
                .then(function (results) {
                    var hasFailures = false,
                        commitMessages = [];

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

                            result.getMessages().forEach(function (message) {
                                self.result.addMessage(message);
                            });

                            // Attempted saves are not persisted and committed. The messages are accessible.
                            commitMessages = commitMessages.concat(result.getCommitMessages());
                        }

                        // The instance of the invoked plugin is available at result.pluginInstance
                    });

                    if (hasFailures) {
                        throw new Error('Called plugin failed with error');
                    }

                    // We make a single save at the end.
                    if (config.save && commitMessages.length > 0) {
                        return self.save('\n' + commitMessages.join('\n'));
                    }
                })
                .then(function () {
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

        return SavingDependency;
    });
}