/*globals define, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    var DiagramDesignerWidgetSubcomponents;

    DiagramDesignerWidgetSubcomponents = function () {
    };

    DiagramDesignerWidgetSubcomponents.prototype.registerSubcomponent = function (objID, sCompID, metaInfo) {
        //store that a subcomponent with a given ID has been added to object with objID
        this._itemSubcomponentsMap[objID] = this._itemSubcomponentsMap[objID] || [];
        this._itemSubcomponentsMap[objID].push(sCompID);

        if (_.isFunction(this.onRegisterSubcomponent)) {
            this.onRegisterSubcomponent(objID, sCompID, metaInfo);
        }
    };

    DiagramDesignerWidgetSubcomponents.prototype.unregisterSubcomponent = function (objID, sCompID) {
        var idx;

        //if there is connection draw or redraw, let the connection manager know about the deletion
        this.dispatchEvent(this.events.ON_UNREGISTER_SUBCOMPONENT, {
            objectID: objID,
            subComponentID: sCompID
        });

        //store that a subcomponent with a given ID has been removed from object with objID
        idx = this._itemSubcomponentsMap[objID].indexOf(sCompID);
        if (idx !== -1) {
            this._itemSubcomponentsMap[objID].splice(idx, 1);
        }

        if (_.isFunction(this.onUnregisterSubcomponent)) {
            this.onUnregisterSubcomponent(objID, sCompID);
        }
    };

    DiagramDesignerWidgetSubcomponents.prototype.unregisterAllSubcomponents = function (objID) {
        var len;

        if (this._itemSubcomponentsMap[objID]) {
            len = this._itemSubcomponentsMap[objID].length;
            while (len--) {
                this.unregisterSubcomponent(objID, this._itemSubcomponentsMap[objID][len]);
            }

            delete this._itemSubcomponentsMap[objID];
        }
    };

    return DiagramDesignerWidgetSubcomponents;
});