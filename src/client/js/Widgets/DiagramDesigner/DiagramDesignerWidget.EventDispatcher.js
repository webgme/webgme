/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['common/EventDispatcher'], function (EventDispatcher) {

    'use strict';

    var DiagramDesignerWidgetEventDispatcher;

    DiagramDesignerWidgetEventDispatcher = function () {
    };

    DiagramDesignerWidgetEventDispatcher.prototype._addEventDispatcherExtensions = function () {
        //event functions to relay information between users
        $.extend(this, new EventDispatcher());

        this.events = {
            ITEM_POSITION_CHANGED: 'ITEM_POSITION_CHANGED', //{ ID, x, y}
            ITEM_ROTATION_CHANGED: 'ITEM_ROTATION_CHANGED', //{ ID, DEG}
            ITEM_SUBCOMPONENT_POSITION_CHANGED: 'ITEM_SUBCOMPONENT_POSITION_CHANGED', // {ItemID, SubComponentID}
            ON_COMPONENT_DELETE: 'ON_COMPONENT_DELETE', // ID
            ON_UNREGISTER_SUBCOMPONENT: 'ON_UNREGISTER_SUBCOMPONENT', // {objectID, subcomponentID},
            ON_COMPONENT_CREATE: 'ON_COMPONENT_CREATE', // ID
            ON_COMPONENT_UPDATE: 'ON_COMPONENT_UPDATE',  // ID
            ON_CLEAR: 'ON_CLEAR', // ID
            ITEM_SIZE_CHANGED: 'ITEM_SIZE_CHANGED' //{ ID, w, h}
        };
    };

    return DiagramDesignerWidgetEventDispatcher;
});