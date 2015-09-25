/*globals define*/
/*jshint browser: true, node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

define([], function () {
    'use strict';
    /**
     * Initializes a new instance of plugin configuration.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param {object} config - deserializes an existing configuration to this object.
     * @alias PluginConfig
     * @constructor
     */
    var PluginConfig = function (config) {
        if (config) {
            var keys = Object.keys(config);
            for (var i = 0; i < keys.length; i += 1) {
                // TODO: check for type on deserialization
                this[keys[i]] = config[keys[i]];
            }
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {object}
     */
    PluginConfig.prototype.serialize = function () {
        var keys = Object.keys(this);
        var result = {};

        for (var i = 0; i < keys.length; i += 1) {
            // TODO: check for type on serialization
            result[keys[i]] = this[keys[i]];
        }

        return result;
    };


    return PluginConfig;
});