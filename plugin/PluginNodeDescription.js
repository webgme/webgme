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
     * @param {string} name - name of the webGME object.
     * @param {string} id - unique identifier of the webGME node object: core.getPath(node)
     * @constructor
     */
    var PluginNodeDescription = function (name, id) {

        this.name = name;
        this.id = id;
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

    /**
     * Deserializes the given serialized plugin node description object.
     *
     * @param {{}} json - serialized plugin node description object
     */
    PluginNodeDescription.prototype.deserialize = function (json) {
        if (json) {
            var keys = Object.keys(json);
            for (var i = 0; i < keys.length; i += 1) {
                // TODO: check for type on deserialization
                this[keys[i]] = json[keys[i]];
            }
        }
    };

    return PluginNodeDescription;
});