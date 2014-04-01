/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define([], function () {

    // JSON serializable object, which contains only strings/values
    var PluginManagerConfiguration = function (config) {
        if (config) {
            var keys = Object.keys(config);
            for (var i = 0; i < keys.length; i += 1) {
                // TODO: check for type on deserialization
                this[keys[i]] = config[keys[i]];
            }
        }
    };

// TODO: something like this
//        config = {
//            "host": CONFIG.mongoip,
//            "port": CONFIG.mongoport,
//            "database": "multi",
//            "project": "CyPhyLight",
//            "token": "",
//            "selected": selectedID,
//            "commit": null, //"#668b3babcdf2ddcd7ba38b51acb62d63da859d90",
//            //"root": ""
//            "branchName": "master"
//        }

    PluginManagerConfiguration.prototype.serialize = function() {
        var keys = Object.keys(this);
        var result = {};

        for (var i = 0; i < keys.length; i += 1) {
            // TODO: check for type on serialization
            result[keys[i]] = this[keys[i]];
        }

        return result;
    };

    return PluginManagerConfiguration;
});