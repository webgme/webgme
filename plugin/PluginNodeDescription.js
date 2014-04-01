/**
 * Created by Zsolt on 3/28/14.
 */

'use strict';
define([], function () {

    // result object that is serializable.
    var PluginNodeDescription = function (name, id) {

        this.name = name;
        this.id = id;
    };

    PluginNodeDescription.prototype.serialize = function() {
        var keys = Object.keys(this);
        var result = {};

        for (var i = 0; i < keys.length; i += 1) {
            // TODO: check for type on serialization
            result[keys[i]] = this[keys[i]];
        }

        return result;
    };

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