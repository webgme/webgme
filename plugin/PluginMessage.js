/**
 * Created by Zsolt on 3/28/14.
 */

'use strict';
define([], function () {

    // result object that is serializable.
    var PluginMessage = function (commitHash, selectedObj, activeSelection, message) {

        this.commitHash = commitHash;
        this.selectedObj = selectedObj;
        this.activeSelection = activeSelection;
        this.message = message;
        // TODO: messsage type ERROR, WARNING, INFO, DEBUG
    };

    PluginMessage.prototype.serialize = function () {
        throw new Error('not implemented yet');
    };

    PluginMessage.prototype.deserialize = function (pluginMessageJSON) {
        throw new Error('not implemented yet');
    };

    return PluginMessage;
});