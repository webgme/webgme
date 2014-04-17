/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

'use strict';
define([], function () {

    /**
     * Initializes a new instance of plugin node description object.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
     */
    var PluginNodeDescription = function (config) {
        if (config) {
            this.name = config.name;
            this.id = config.id;
        } else {
            this.name = '';
            this.id = '';
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{}}
     */
    PluginNodeDescription.prototype.serialize = function() {
        var keys = Object.keys(this);
        var result = {};

        for (var i = 0; i < keys.length; i += 1) {
            // TODO: check for type on serialization
            result[keys[i]] = this[keys[i]];
        }

        return result;
    };

    return PluginNodeDescription;
});