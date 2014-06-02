/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define(['logManager',
    './SnapEditorWidget.Constants',
    './ItemBase',
    './ErrorDecorator'], function (logManager,
                                   SnapEditorWidgetConstants,
                                   ItemBase,
                                   ErrorDecorator) {

    var ClickableItem,
        NAME = "ClickableItem";

    ClickableItem = function(objId, canvas){
        this._super(NAME, objId, canvas);

        //Clickable items that depend on this one for location
        //That is, the child nodes and the 'next' ptr
        this.base = null;
        this.dependents = [];
        this.ptrs = { in: {}, out: {} };
        this.ptrNames = null;
    };

    ClickableItem.prototype.setPtrTo = function (item, ptr) {
        this.ptrs.out[ptr] = item;
    };

    ClickableItem.prototype.setPtrFrom = function (item, ptr) {
        this.ptrs.in[ptr] = item;
    };

    ClickableItem.prototype.getPtrNames = function () {
        //Get ptrNames from defined connection areas
        var areas = this.getConnectionAreas(),
            i = areas.length,
            ptrs = [];

        while(i--){
            ptrs.push(areas[i].ptr);
        }

        return ptrs;
    };

    ClickableItem.prototype.hasPtr = function (ptr) {
        if(this.ptrNames === null){
            this.ptrNames = this.getPtrNames();
        }

        return this.ptrNames.indexOf(ptr) !== -1;
    };

    ClickableItem.prototype.getNextItem = function () {
        return this.ptrs.out[SnapEditorWidgetConstants.PTR_NEXT];
    };

    ClickableItem.prototype.getConnectionAreas = function () {
        /*
         * For the ClickableItem, the connection areas need to
         * contain the id of their parent as some of the future
         * methods will rely on simply the connection areas to link
         * two objects together. 
         */
        var result = [],
            areas = this._decoratorInstance.getConnectionAreas(),
            i = areas.length,
            cArea;

        while (i--) {
            cArea = areas[i];

            cArea.x1 += this.positionX;
            cArea.y1 += this.positionY;
            cArea.x2 += this.positionX;
            cArea.y2 += this.positionY;
            cArea.parentId = this.id;

            result.push(cArea);
        }

        return result;
    };

    //Get a specific connection area
    ClickableItem.prototype.getConnectionArea = function (ptr, role) {
        //Returns the first (and should be only) connection area of the given type
        var areas = this.getConnectionAreas(),
            area;

        while(areas.length){
            area = areas.pop();
            //If the area has the role or is unspecified
            if((!role || area.role === role) && (!ptr || area.ptr === ptr 
                        || (area.ptr instanceof Array && area.ptr.indexOf(ptr) !== -1))){
                return area;
            }
        }

        return null;
    };

    ClickableItem.prototype.moveBy = function (dX, dY) {
        //Moving a clickable item will also move any of the 'next' pointers
        this.moveTo(this.positionX + dX, this.positionY + dY);

        var i = this.dependents.length;

        while(i--){
            this.dependents[i].moveBy(dX, dY);
        };
    };


    /************ SUBCOMPONENT HANDLING *****************/
    ClickableItem.prototype.registerSubcomponent = function (subComponentId, metaInfo) {
        this.logger.debug("registerSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.registerSubcomponent(this.id, subComponentId, metaInfo);
    };

    ClickableItem.prototype.unregisterSubcomponent = function (subComponentId) {
        this.logger.debug("unregisterSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.unregisterSubcomponent(this.id, subComponentId);
    };

    ClickableItem.prototype.registerConnectors = function (el, subComponentId) {
        el.attr(SnapEditorWidgetConstants.DATA_ITEM_ID, this.id);
        if (subComponentId !== undefined && subComponentId !== null) {
            el.attr(SnapEditorWidgetConstants.DATA_SUBCOMPONENT_ID, subComponentId);
        }
    };

    ClickableItem.prototype.updateSubcomponent = function (subComponentId) {
        //let the decorator instance know about the update
        this._decoratorInstance.updateSubcomponent(subComponentId);
    };

    /*********************** CONNECTION END CONNECTOR HIGHLIGHT ************************/

    ClickableItem.prototype.showSourceConnectors = function (params) {
        if (this.canvas._enableConnectionDrawing === true) {
            //this._decoratorInstance.showSourceConnectors(params);
            //TODO Change this to be the clickable areas (connection areas)
        }
    };

    ClickableItem.prototype.hideSourceConnectors = function () {
        //this._decoratorInstance.hideSourceConnectors();
        //TODO Change this to be the clickable areas (connection areas)
    };

    ClickableItem.prototype.showEndConnectors = function (params) {
        if (this.canvas._enableConnectionDrawing === true) {
            this._decoratorInstance.showEndConnectors(params);
        }
    };

    ClickableItem.prototype.hideEndConnectors = function () {
        this._decoratorInstance.hideEndConnectors();
    };

    /******************** HIGHLIGHT / UNHIGHLIGHT MODE *********************/
    ClickableItem.prototype.highlight = function () {
        this.$el.addClass(SnapEditorWidgetConstants.ITEM_HIGHLIGHT_CLASS);
    };

    ClickableItem.prototype.unHighlight = function () {
        this.$el.removeClass(SnapEditorWidgetConstants.ITEM_HIGHLIGHT_CLASS);
    };

    ClickableItem.prototype.doSearch = function (searchDesc) {
        return this._decoratorInstance.doSearch(searchDesc);
    };

    ClickableItem.prototype.getDrawnConnectionVisualStyle = function (sCompId) {
        return this._decoratorInstance.getDrawnConnectionVisualStyle(sCompId);
    };

    ClickableItem.prototype.onItemComponentEvents = function (eventList) {
        this._decoratorInstance.notifyComponentEvent(eventList);
    };

    _.extend(ClickableItem.prototype, ItemBase.prototype);

    return ClickableItem;
});
