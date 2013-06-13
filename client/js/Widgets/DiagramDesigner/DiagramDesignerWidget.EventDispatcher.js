"use strict";

define(['eventDispatcher'], function (EventDispatcher) {

    var DiagramDesignerWidgetEventDispatcher;

    DiagramDesignerWidgetEventDispatcher = function () {
    };

    DiagramDesignerWidgetEventDispatcher.prototype._addEventDispatcherExtensions = function () {
        //event functions to relay information between users
        $.extend(this, new EventDispatcher());

        this.events = {
            "ITEM_POSITION_CHANGED": "ITEM_POSITION_CHANGED", //{ ID, x, y}
            "ITEM_SUBCOMPONENT_POSITION_CHANGED": "ITEM_SUBCOMPONENT_POSITION_CHANGED", // {ItemID, SubComponentID}
            "ON_COMPONENT_DELETE": "ON_COMPONENT_DELETE", // ID
            "ON_UNREGISTER_SUBCOMPONENT": "ON_UNREGISTER_SUBCOMPONENT" // {objectID, subcomponentID}
        };
    };

    return DiagramDesignerWidgetEventDispatcher;
});