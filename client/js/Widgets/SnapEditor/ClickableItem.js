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
                                   CONSTANTS,
                                   ItemBase,
                                   ErrorDecorator) {

    var ClickableItem,
        NAME = "clickable-item";
    
    ClickableItem = function(objId, canvas){
        this._super(NAME, objId, canvas);

        //Clickable items that depend on this one for location
        //That is, the child nodes and the 'next' ptr
        this.ptrs = { in: {}, out: {} };
        this.ptrNames = null;
        this.activeConnectionArea = null;
    };

    _.extend(ClickableItem.prototype, ItemBase.prototype);

    ClickableItem.prototype.$_DOMBase = $('<div/>').attr({ "class": CONSTANTS.DESIGNER_ITEM_CLASS });

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
        return this.ptrs.out[CONSTANTS.PTR_NEXT];
    };

    ClickableItem.prototype.getDependents = function () {
        var deps = [],
            keys = Object.keys(this.ptrs.out);

        while(keys.length){
            deps.push(this.ptrs.out[keys.pop()]);
        }

        return deps;
    };

    /******************** ALTER SVG  *********************/
    ClickableItem.prototype.resize = function (ptrName, item) {

        var box = item.getBoundingBox();
        if(box.width === 0 && box.height === 0){
            //Try to get width and height from the svg
            var svg = item._decoratorInstance.$svgElement[0],
                width = svg.width.baseVal.value,
                height = svg.height.baseVal.value;

            box.width = width;
            box.x2 += width;
            box.height = height;
            box.y2 += height;
        }

        //stretch the decorator 
        var x = box.x2 - box.x,
            y = box.y2 - box.y;

        /*
         * Consider adding differing support for connections to 
         * contained items vs sibling items (children with the 
         * same parent anyway)
         *
        if(ptrName.indexOf(CONSTANTS.PTR_NEXT) !== -1){//for 'next' pointer
            x = Math.max(box.x2 - this.positionX + this._width, 0);
            this._decoratorInstance.stretch(ptrName, x, y);
        }else{
         */
            this._decoratorInstance.stretch(ptrName, x, y);
        //}
    };

    ClickableItem.prototype.updateDependents = function () {
        //Reconnect all the pointers that are going out of
        //this item
        var ptrs = Object.keys(this.ptrs.out),
            i = ptrs.length;

        while(i--){
            this.ptrs.out[ptrs[i]].connect(this, ptrs[i], false);//Don't resize
            this.ptrs.out[ptrs[i]].updateDependents();
        }
    };

    ClickableItem.prototype.setToConnect = function (otherItem, ptrName) {
        //Set this item to connect to another
        //Won't actually connect them until "updateDependents" is called

        otherItem.setPtrTo(this, ptrName);
        this.setPtrFrom(otherItem, ptrName);

        //Resize
        otherItem.resize(ptrName, this);
        this.resize(ptrName, otherItem);

    };

    ClickableItem.prototype.connect = function (otherItem, ptrName, resize) {
        //Connect this item to another item
        //This item will be moved to fit in/next to the other one
        
        var connArea1 = otherItem.getConnectionArea(ptrName, CONSTANTS.CONN_PASSING),
            connArea2 = this.getConnectionArea(ptrName, CONSTANTS.CONN_ACCEPTING),
            dis = this._getDistance(connArea1, connArea2);


        otherItem.setPtrTo(this, ptrName);
        this.setPtrFrom(otherItem, ptrName);

        this.moveByWithDependents(-dis.dx, -dis.dy);

        if(resize !== false){
            this.resize(ptrName, otherItem);
            otherItem.resize(ptrName, this);
        }
    };

    ClickableItem.prototype.connectToActive = function (otherItem) {
        //Connect this item to the otherItem's active connection area
        var ptr = otherItem.activeConnectionArea.ptr,
            role = CONSTANTS.CONN_ACCEPTING;

        if(otherItem.activeConnectionArea.role === CONSTANTS.CONN_ACCEPTING) {
            role = CONSTANTS.CONN_PASSING;
        }

        var connArea = this.getConnectionArea(ptr, role),
            distance = this._getDistance(connArea, otherItem.activeConnectionArea);

        otherItem.setPtrTo(this, ptr);
        this.setPtrFrom(otherItem, ptr);

        this.moveByWithDependents(distance.dx, distance.dy);

        //resize as necessary
        this.resize(ptr, otherItem);
        otherItem.resize(ptr, this);
    };

    ClickableItem.prototype._getDistance = function (connArea1, connArea2) {//Move first to second
        var c1 = { x: (connArea1.x2 + connArea1.x1)/2,//center of first area
            y: (connArea1.y2 + connArea1.y1)/2 },
            c2 = { x: (connArea2.x2 + connArea2.x1)/2,//center of second area
                y: (connArea2.y2 + connArea2.y1)/2 },
            dx = c2.x - c1.x,
            dy = c2.y - c1.y;

        return { dx: dx, dy: dy };
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
            cArea = this._makeConnAreaAbsolute(areas[i]);

            cArea.parentId = this.id;
            result.push(cArea);
        }

        return result;
    };

    //Convenience method
    ClickableItem.prototype.getConnectionArea = function (ptr, role) {
        var area = this._decoratorInstance.getConnectionArea(ptr, role);
        area.parentId = this.id;

        return this._makeConnAreaAbsolute(area);
    };

    ClickableItem.prototype._makeConnAreaAbsolute = function (area) {
        area.x1 += this.positionX;
        area.y1 += this.positionY;
        area.x2 += this.positionX;
        area.y2 += this.positionY;

        return area;
    };

    ClickableItem.prototype.onHover = function (event) {
            //this._decoratorInstance.displayConnectionArea('next', 'out');
    };

    ClickableItem.prototype.onUnHover = function (event) {
            //this._decoratorInstance.hideConnectionAreas();
    };

    ClickableItem.prototype.updateHighlight = function (draggedItem, position) {
        //Determine the active connection area
        //First, remove any old stuff
        this.deactivateConnectionAreas();

        //Get all empty pointers and compare with draggedItem's available pointers.
        //Closest compatible pointers determines the active conn area
        var shift = { x: position.left - draggedItem.positionX,
                      y: position.top - draggedItem.positionY },
            openAreas = this._decoratorInstance.getAvailableConnectionAreas(),
            closestArea = null,
            closestIndex = null,
            i = openAreas.length,
            otherArea,
            ptr,
            role;

        //Check to find the 
        while(i--){
            ptr = openAreas[i].ptr;
            role = openAreas[i].role === CONSTANTS.CONN_ACCEPTING ? 
                CONSTANTS.CONN_PASSING : CONSTANTS.CONN_ACCEPTING;
            otherArea = draggedItem.getConnectionArea(ptr, role);

            if(otherArea && !otherArea.occupied
                    && (!closestIndex || this.__getShiftedDistance(openAreas[i], otherArea, shift))){
                        closestIndex = i;
                        closestArea = this.__getShiftedDistance(openAreas[i], otherArea, shift);
            }
        }

        //Activate the connection area
        if(closestIndex !== null){
            this.setActiveConnectionArea(openAreas[closestIndex]);
            return true;
        }
        return false;
    };

    ClickableItem.prototype.__getShiftedDistance = function (area1, area2, shift) {
        //Get the distance between connection areas
        //measuring from the centers
        var x1 = (area1.x2 + area1.x1 + shift.x)/2,
            x2 = (area2.x2 + area2.x1 + shift.x)/2,
            y1 = (area1.y2 + area1.y1 + shift.y)/2,
            y2 = (area2.y2 + area2.y1 + shift.y)/2;

        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    ClickableItem.prototype.setActiveConnectionArea = function (area) {
        this.activeConnectionArea = area;
        this._decoratorInstance.displayConnectionArea(this.activeConnectionArea);
    };

    ClickableItem.prototype.deactivateConnectionAreas = function () {
        this.activeConnectionArea = null;
        this._decoratorInstance.hideConnectionAreas();
    };

    ClickableItem.prototype.moveByWithDependents = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);

        var dependents = Object.keys(this.ptrs.out),
            i = dependents.length;

        while(i--){
            this.ptrs.out[dependents[i]].moveByWithDependents(dX, dY);
        };
    };

    ClickableItem.prototype.moveBy = function (dX, dY) {
        //Moving a clickable item will also move any of the 'next' pointers
        this.moveTo(this.positionX + dX, this.positionY + dY);
    };

    //OVERRIDE
    ClickableItem.prototype.update = function (objDescriptor) {
        //check what might have changed
        //update position
        if (objDescriptor.position && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
            var dx = objDescriptor.position.x - this.positionX,
                dy = objDescriptor.position.y - this.positionY;

            this.moveByWithDependents(dx, dy);
        }

        //update decorator if needed
        if (objDescriptor.decoratorClass && this._decoratorID !== objDescriptor.decoratorClass.prototype.DECORATORID) {

            this.logger.debug("decorator update: '" + this._decoratorID + "' --> '" + objDescriptor.decoratorClass.prototype.DECORATORID + "'...");

            var oldControl = this._decoratorInstance.getControl();
            var oldMetaInfo = this._decoratorInstance.getMetaInfo();

            this.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, oldControl, oldMetaInfo, objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);

            //attach new one
            this.$el.html(this._decoratorInstance.$el);

            this.logger.debug("ItemBase's ['" + this.id + "'] decorator  has been updated.");

            this._callDecoratorMethod("on_addTo");
        } else {
            //if decorator instance not changed
            //let the decorator instance know about the update
            if (objDescriptor.metaInfo) {
                this._decoratorInstance.setMetaInfo(objDescriptor.metaInfo);
            }
            this._decoratorInstance.update();
        }
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
        el.attr(CONSTANTS.DATA_ITEM_ID, this.id);
        if (subComponentId !== undefined && subComponentId !== null) {
            el.attr(CONSTANTS.DATA_SUBCOMPONENT_ID, subComponentId);
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
        this.$el.addClass(CONSTANTS.ITEM_HIGHLIGHT_CLASS);
    };

    ClickableItem.prototype.unHighlight = function () {
        this.$el.removeClass(CONSTANTS.ITEM_HIGHLIGHT_CLASS);
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

    return ClickableItem;
});
