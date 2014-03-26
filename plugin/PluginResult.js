/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define([], function () {

    // result object that is serializable.
    var PluginResult = function () {

    };

    PluginResult.prototype.success = false;
    PluginResult.prototype.error = '';
    // context checker results

    return PluginResult;
});