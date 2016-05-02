/*globals define*/
/*jshint browser: true, node:true*/

/**
 * A module representing a PluginNodeDescription.
 *
 * @author lattmann / https://github.com/lattmann
 */


define([], function () {
    'use strict';
    /**
     * Initializes a new instance of plugin node description object.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
     * @alias PluginNodeDescription
     */
    var PluginNodeDescription = function (config) {
        var keys,
            i;

        this.name = '';
        this.id = '';

        if (config) {
            keys = Object.keys(config);
            for (i = 0; i < keys.length; i += 1) {
                this[keys[i]] = config[keys[i]];
            }
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{}}
     */
    PluginNodeDescription.prototype.serialize = function () {
        var keys = Object.keys(this),
            result = {},
            i;

        for (i = 0; i < keys.length; i += 1) {
            result[keys[i]] = this[keys[i]];
        }

        return result;
    };

    return PluginNodeDescription;
});