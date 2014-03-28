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

    return PluginNodeDescription;
});