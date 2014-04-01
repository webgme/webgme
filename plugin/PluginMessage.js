/**
 * Created by Zsolt on 3/28/14.
 */

'use strict';
define(['plugin/PluginNodeDescription'], function (PluginNodeDescription) {

    // result object that is serializable.
    var PluginMessage = function (commitHash, selectedObj, activeSelection, message) {

        this.commitHash = commitHash || '';
        this.selectedObj = selectedObj || new PluginNodeDescription();
        this.activeSelection = activeSelection || [];
        this.message = message || '';
        // TODO: messsage type ERROR, WARNING, INFO, DEBUG
    };

    PluginMessage.prototype.serialize = function() {
        var result = {
            commitHash: this.commitHash,
            selectedObj: this.selectedObj.serialize(),
            activeSelection: [],
            message: this.message
        };

        for (var i = 0; i < this.activeSelection.length; i += 1) {
            result.activeSelection.push(this.activeSelection[i].serialize());
        }

        return result;
    };

    PluginMessage.prototype.deserialize = function (json) {
        if (json) {
            this.commitHash = json.commitHash;
            var selectedObj = new PluginNodeDescription();
            selectedObj.deserialize(json.selectedObj);
            this.selectedObj = selectedObj;
            this.activeSelection = [];
            this.message = json.message;

            for (var i = 0; i < json.activeSelection.length; i += 1) {
                var activeObj = new PluginNodeDescription();
                activeObj.deserialize(json.activeSelection[i]);
                this.activeSelection.push(activeObj);
            }
        }
    };

    return PluginMessage;
});