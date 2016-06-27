/*globals define*/
/*jshint node:true, browser:true*/

if (typeof define === 'undefined') {

} else {
    define([
        'plugin/PluginConfig',
        'plugin/PluginBase',
        'text!./metadata.json'
    ], function (PluginConfig,
                 PluginBase,
                 pluginMetadata) {
        'use strict';

        pluginMetadata = JSON.parse(pluginMetadata);
        var FastForward = function () {
            // Call base class' constructor.
            PluginBase.call(this);
            this.pluginMetadata = pluginMetadata;
        };

        FastForward.metadata = pluginMetadata;

        FastForward.prototype = Object.create(PluginBase.prototype);
        FastForward.prototype.constructor = FastForward;

        FastForward.prototype.main = function (callback) {
            var self = this,
                startingCommitHash = self.currentHash;

            self.fastForward()
                .then(function (didUpdate) {
                    if (didUpdate === true && startingCommitHash === self.currentHash) {
                        throw new Error('didUpdate was true but still on same currentHash!');
                    } else if (didUpdate === false && startingCommitHash !== self.currentHash) {
                        throw new Error('didUpdate was false but changed currentHash!');
                    }

                    self.core.setAttribute(self.activeNode, 'name', 'aNewNameWasSet');

                    return self.save('changed name of activeNode');
                })
                .then(function () {
                    self.result.setSuccess(true);
                    callback(null, self.result);
                })
                .catch(function (err) {
                    callback(err, self.result);
                });
        };

        return FastForward;
    });
}