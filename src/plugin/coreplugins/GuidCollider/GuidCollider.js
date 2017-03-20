/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Plugin mainly used for testing.
 * @author kecso / https://github.com/kecso
 * @module CorePlugins:GuidCollider
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'common/util/guid',
    'q',
    'text!./metadata.json'
], function (PluginConfig, PluginBase, GUID, Q, pluginMetadata) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of MinimalWorkingExample.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin MinimalWorkingExample.
     * @constructor
     */
    function GuidCollider() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;

        // we do not know the meta types, will be populated during run time
        this.metaTypes = {};
    }

    GuidCollider.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    GuidCollider.prototype = Object.create(PluginBase.prototype);
    GuidCollider.prototype.constructor = GuidCollider;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warn,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(Error, plugin.PluginResult)} callback - the result callback
     */
    GuidCollider.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            currentConfiguration = self.getCurrentConfig(),
            guids = {},
            hasCollision = false,
            visitFn = function (node, next) {
                var oldGuid = self.core.getGuid(node),
                    newGuid;
                if (guids.hasOwnProperty(oldGuid)) {
                    hasCollision = true;
                    if (currentConfiguration.checkOnly) {
                        self.createMessage(node, 'guid collision with: ' + guids[oldGuid]);
                    } else {
                        newGuid = GUID();
                        self.core.setGuid(node, newGuid);
                        self.createMessage(node, 'guid changed [' + oldGuid + ']->[' + newGuid + ']');
                        guids[newGuid] = self.core.getPath(node);
                    }
                } else {
                    guids[oldGuid] = self.core.getPath(node);
                }
                next(null);
            };

        self.updateMETA(self.metaTypes);

        Q.ninvoke(self.core, 'traverse', self.rootNode, null, visitFn)
            .then(function () {
                if (hasCollision && currentConfiguration.checkOnly === false) {
                    return self.save('guid collision fix');
                } else {
                    return {};
                }
            })
            .then(function (status) {
                self.result.setSuccess(true);
            })
            .catch(function (err) {
                self.result.setError('Failed execution: ', err.message);
                self.result.setSuccess(false);
            })
            .finally(function () {
                callback(null, self.result);
            });
    };

    return GuidCollider;
});