"use strict";

define([], function () {

    var DesignerCanvasSubcomponents;

    DesignerCanvasSubcomponents = function () {
    };

    DesignerCanvasSubcomponents.prototype.registerSubcomponent = function (objID, sCompID, metaInfo) {
        //store that a subcomponent with a given ID has been added to object with objID
        this._itemSubcomponentsMap[objID] = this._itemSubcomponentsMap[objID] || [];
        this._itemSubcomponentsMap[objID].push(sCompID);

        this.onRegisterSubcomponent(objID, sCompID, metaInfo);
    };

    DesignerCanvasSubcomponents.prototype.unregisterSubcomponent = function (objID, sCompID) {
        var idx;

        //store that a subcomponent with a given ID has been removed from object with objID
        idx = this._itemSubcomponentsMap[objID].indexOf(sCompID);
        if (idx !== -1) {
            this._itemSubcomponentsMap[objID].splice(idx,1);
        }

        this.onUnregisterSubcomponent(objID, sCompID);
    };

    return DesignerCanvasSubcomponents;
});