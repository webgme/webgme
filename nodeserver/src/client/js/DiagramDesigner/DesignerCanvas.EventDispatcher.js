"use strict";

define(['eventDispatcher'], function (EventDispatcher) {

    var DesignerCanvasEventDispatcher;

    DesignerCanvasEventDispatcher = function () {
    };

    DesignerCanvasEventDispatcher.prototype._addEventDispatcherExtensions = function () {
        //event functions to relay information between users
        $.extend(this, new EventDispatcher());

        this.events = {
            "ITEM_POSITION_CHANGED": "ITEM_POSITION_CHANGED", //{ ID, x, y}
            "ITEM_SUBCOMPONENT_POSITION_CHANGED": "ITEM_SUBCOMPONENT_POSITION_CHANGED" // {ItemID, SubComponentID}
        };
    };

    return DesignerCanvasEventDispatcher;
});