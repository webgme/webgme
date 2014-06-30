/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define(['logManager',
    './SnapEditorWidget.Constants',
    'util/assert',
    './ItemBase',
    './ErrorDecorator'], function (logManager,
                                   CONSTANTS,
                                   assert,
                                   ItemBase,
                                   ErrorDecorator) {

    var ClickableItem,
        NAME = "clickable-item";
    
    ClickableItem = function(objId, canvas){
        this._super(NAME, objId, canvas);

        //Clickable items that depend on this one for location
        //That is, the child nodes and the 'next' ptr
        this.ptrs = {};
        this.ptrs[CONSTANTS.CONN_ACCEPTING] = {};
        this.ptrs[CONSTANTS.CONN_PASSING] = {};

        this.conn2Item = {};//item connected to sorted by connection area id
        this.item2Conn = {};
        this.ptrNames = null;
        this.activeConnectionArea = null;

        this._color = CONSTANTS.COLOR_PRIMARY;
    };

    _.extend(ClickableItem.prototype, ItemBase.prototype);

    ClickableItem.prototype.$_DOMBase = $('<div/>').attr({ "class": CONSTANTS.DESIGNER_ITEM_CLASS });

    /* * * * * * * * * * * * * POINTERS * * * * * * * * * * * * */ 
    ClickableItem.prototype.isPositionDependent = function (ptrInfo) {
        return Object.keys(this.ptrs[CONSTANTS.CONN_ACCEPTING]).length !== 0;
    };

    ClickableItem.prototype.updatePtrs = function (ptrInfo) {
        //Update the OUT pointers given a dictionary of ptrs
        //Will need to update the other item as well
        var ptrs = Object.keys(ptrInfo),
            oldPtrs = Object.keys(this.ptrs[CONSTANTS.CONN_PASSING]),
            i = ptrs.length,
            changed = null,
            otherItem,
            oldItem,
            k,
            ptr;

        while (i--){
            ptr = ptrs[i];
            k = oldPtrs.indexOf(ptr);

            if (ptrInfo[ptr]){//If pointer is set
                if (k === -1){//didn't have the pointer
                    //Add pointer
                    otherItem = this.canvas.items[ptrInfo[ptr]];
                    otherItem.setPtr(ptr, CONSTANTS.CONN_ACCEPTING, this);
                    changed = "added ptr";
                } else {
                    //Check that the pointer is correct
                    if (this.ptrs[CONSTANTS.CONN_PASSING][ptr].id !== ptrInfo[ptr]){
                        oldItem = this.ptrs[CONSTANTS.CONN_PASSING][ptr];
                        oldItem.removePtr(ptr, CONSTANTS.CONN_ACCEPTING, false);

                        otherItem = this.canvas.items[ptrInfo[ptr]];
                        otherItem.setPtr(this, ptr, CONSTANTS.CONN_ACCEPTING);
                        changed = "changed ptr";
                    }
                    oldPtrs.splice(k, 1);
                }
            }
        }

        //Remove old pointers
        i = oldPtrs.length;
        while (i--){
            ptr = oldPtrs[i];
            this.removePtr(ptr, CONSTANTS.CONN_PASSING, false);
            changed = "removed ptr";
        }

        return changed;
    };

    ClickableItem.prototype.setPtr = function (ptr, role, item) {
        var otherRole = role === CONSTANTS.CONN_ACCEPTING ? 
                CONSTANTS.CONN_PASSING : CONSTANTS.CONN_ACCEPTING;

        assert(item !== this, "Should never set a pointer to itself");

        if (this.ptrs[role][ptr]){
            this.removePtr(ptr, role);
        }

        this.ptrs[role][ptr] = item;
        item.ptrs[otherRole][ptr] = this;

        //Update the colors of the attaching item
        if (role === CONSTANTS.CONN_PASSING){
            item.updateColors();
        } else {
            this.updateColors();
        }

    };

    ClickableItem.prototype.disconnectPtrs = function (role) {
        //Disconnect the incoming or outgoing pointers and 
        var keys = Object.keys(this.ptrs[role]),
            ptr;

        while (keys.length){
            ptr = keys.pop();

            this.removePtr(ptr, role);
        }
    };

    ClickableItem.prototype.getPtrNames = function () {
        //Get ptrNames from defined connection areas
        var areas = this.getConnectionAreas(),
            i = areas.length,
            ptrs = [];

        while (i--){
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

    ClickableItem.prototype.removePtr = function (ptr, role, resize) {
        //remove pointers and resize
        var item = this.ptrs[role][ptr],
            otherRole = role === CONSTANTS.CONN_ACCEPTING ? 
                CONSTANTS.CONN_PASSING : CONSTANTS.CONN_ACCEPTING;

        if(resize === true){
            if (role === CONSTANTS.CONN_ACCEPTING){
                item._updateSize(ptr, null);
            } else {
                this._updateSize(ptr, null);
            }
        }
        
        //free the connections
        var connId = this.item2Conn[item.id],
            otherConnId = item.item2Conn[this.id];

        delete this.item2Conn[item.id];
        delete this.conn2Item[connId];

        delete item.item2Conn[this.id];
        delete item.conn2Item[otherConnId];

        //remove pointer
        delete this.ptrs[role][ptr];
        delete item.ptrs[otherRole][ptr];
    };

    ClickableItem.prototype.cleanConnectionAreas = function (ptrs) {
        this._decoratorInstance.cleanConnections(ptrs);
    };

    /* * * * * * * * * * * * * COLORING * * * * * * * * * * * * */ 
    ClickableItem.prototype.setColor = function () {
        var keys = Object.keys(this.ptrs[CONSTANTS.CONN_ACCEPTING]);

        if (keys.length){

            var basePtr,
                base,
                color,
                oldColor,
                changed = false;

            basePtr = keys[0]; 
            base = this.ptrs[CONSTANTS.CONN_ACCEPTING][basePtr];
            color = base._color;

            //If the item has more than one object pointing in, then we won't know
            //for sure where to place it as the object pointing in determines
            //the item's location
            assert(keys.length === 1, "Item should have only one object pointing into it");

            //Need to check if they have the same svg or svg color. If so, check whether
            //the item is set to it's PRIMARY or SECONDARY color and set this one accordingly
            oldColor = this._color;
            this._color = this._decoratorInstance.setColor(base._decoratorInstance, color);

            changed = oldColor !== this._color;
        }

        return changed;
    };

    ClickableItem.prototype.updateColors = function () {
        //Update this object and all children objects
        //as long as their colors are being changed
        if(this.setColor()){
            //update the colors of dependents
            var dependentKeys = Object.keys(this.ptrs[CONSTANTS.CONN_PASSING]),
                i = dependentKeys.length;
            while (i--){
                this.ptrs[CONSTANTS.CONN_PASSING][dependentKeys[i]].updateColors();
            }
        }
    };

    /* * * * * * * * * * * * * CONNECTIONS * * * * * * * * * * * * */ 

    ClickableItem.prototype.isOccupied = function (connId) {
        return this.conn2Item[connId] !== undefined;
    };

    ClickableItem.prototype.getNextItem = function () {
        return this.ptrs[CONSTANTS.CONN_PASSING][CONSTANTS.PTR_NEXT];
    };

    ClickableItem.prototype.getDependentsByType = function () {
        //Return sibling/non-sibling dependents
        var result = { siblings: [], children: [] },
            ptrs = Object.keys(this.ptrs[CONSTANTS.CONN_PASSING]),
            ptr;

        while (ptrs.length){
            ptr = ptrs.pop();

            if (CONSTANTS.SIBLING_PTRS.indexOf(ptr) === -1){
                result['siblings'].push(this.ptrs[CONSTANTS.CONN_PASSING][ptr].id);
            } else {
                result['children'].push(this.ptrs[CONSTANTS.CONN_PASSING][ptr].id);
            }
        }

        return result;
    };

    ClickableItem.prototype.getParent = function () {
        //get parent in dependency tree
        var ptrs = Object.keys(this.ptrs[CONSTANTS.CONN_ACCEPTING]),
            result = null;

            assert(ptrs.length <= 1, "Item should have only one object pointing into it");

            if (ptrs.length === 1){
                result = this.ptrs[CONSTANTS.CONN_ACCEPTING][ptrs.pop()];
            }

            return result;
    };

    ClickableItem.prototype.getDependents = function () {
        var deps = [],
            keys = Object.keys(this.ptrs[CONSTANTS.CONN_PASSING]);

        while (keys.length){
            deps.push(this.ptrs[CONSTANTS.CONN_PASSING][keys.pop()]);
        }

        return deps;
    };

    ClickableItem.prototype.getTotalSize = function () {
        //Get the size of the object and the dependents
        var result = this.getBoundingBox(),
            deps = this.getDependents(),
            siblingPtrs,
            sibling,
            box,
            dependent;

        while (deps.length){
            dependent = deps.pop();
            box = dependent.getBoundingBox();

            //add the dependent to the total size
            result.x = Math.min(result.x, box.x);
            result.x2 = Math.max(result.x2, box.x2);
            result.y = Math.min(result.y, box.y);
            result.y2 = Math.max(result.y2, box.y2);

            //Add all siblings of the dependent -- BFS
            siblingPtrs = Object.keys(dependent.ptrs[CONSTANTS.CONN_PASSING]);
            for(var i = siblingPtrs.length - 1; i >= 0; i--){
                if(CONSTANTS.SIBLING_PTRS.indexOf(siblingPtrs[i]) !== -1){//if it is a sibling
                    sibling = dependent.ptrs[CONSTANTS.CONN_PASSING][siblingPtrs.pop()];
                    deps.push(sibling);
                }
            }

        }

        //update width, height
        result.width = result.x2 - result.x;
        result.height = result.y2 - result.y;

        return result;
    };

    //Override
    ClickableItem.prototype.getBoundingBox = function () {
        var box = {"x": this.positionX,
                "y": this.positionY,
                "width": this._width,
                "height": this._height,
                "x2": this.positionX + this._width,
                "y2":  this.positionY + this._height};

        if(box.width === 0 && box.height === 0){
            //Try to get width and height from the svg
            var svg = this._decoratorInstance.$svgElement[0],
                width = svg.width.baseVal.value,
                height = svg.height.baseVal.value;

            box.width = width;
            box.x2 += width;
            box.height = height;
            box.y2 += height;
        }

        return box;
    };

    /******************** ALTER SVG  *********************/
    ClickableItem.prototype.updateSize = function () {
        //Update ALL pointers not just currently occupied
        var ptrNames = this.getPtrNames(),
            changed = false;

        if(ptrNames.length){
            var ptrs = [],
                i = ptrNames.length;

            while(i--){
                if(!(ptrNames[i] instanceof Array)){
                    ptrs.push(ptrNames[i]);
                }
            }

            i = ptrs.length;
            while(i--){
                changed = this._updateSize(ptrs[i], this.ptrs[CONSTANTS.CONN_PASSING][ptrs[i]]) || changed;
            }
        }

        return changed;
    };

    ClickableItem.prototype._updateSize = function (ptrName, item) {
        var box = item ? item.getTotalSize() : { width: 0, height: 0 };

        if (CONSTANTS.SIBLING_PTRS.indexOf(ptrName) === -1){
            //stretch the decorator 
            return this._decoratorInstance.stretchTo(ptrName, box.width, box.height);
        }
        return false;//return if it changed
    };

    ClickableItem.prototype.updatePosition = function () {
        var ptrs = Object.keys(this.ptrs[CONSTANTS.CONN_ACCEPTING]);

        assert(ptrs.length <= 1, "An item can only be connected to one other item");

        //Connect this item to it's parent
        if (this.isPositionDependent()){
            this.connectByPointerName(this.ptrs[CONSTANTS.CONN_ACCEPTING][ptrs[0]], 
                                      ptrs[0], CONSTANTS.CONN_ACCEPTING);
        }
    };

    ClickableItem.prototype.updateDependents = function () {
        //Reconnect all the pointers that are going out of
        //this item
        var ptrs = Object.keys(this.ptrs[CONSTANTS.CONN_PASSING]),
            i = ptrs.length;

        while (i--){
            this.ptrs[CONSTANTS.CONN_PASSING][ptrs[i]]
                .connectByPointerName(this, ptrs[i], CONSTANTS.CONN_ACCEPTING);
            this.ptrs[CONSTANTS.CONN_PASSING][ptrs[i]].updateDependents();
        }
    };

    ClickableItem.prototype.connectByPointerName = function (otherItem, ptrName, role, resize) {
        //Connect this item to another item
        //This item will be moved to fit in/next to the other one
        
        var otherRole = role === CONSTANTS.CONN_ACCEPTING ? 
                CONSTANTS.CONN_PASSING : CONSTANTS.CONN_ACCEPTING,
            connArea1 = this.getConnectionArea(ptrName, role),
            connArea2 = otherItem.getConnectionArea(ptrName, otherRole);

        this._connect({ ptr: ptrName,
                        role: CONSTANTS.CONN_ACCEPTING,
                        area1: connArea1,
                        area2: connArea2,
                        otherItem: otherItem,
                        resize: resize });

    };

    ClickableItem.prototype.connectToActive = function (otherItem) {
        //Connect this item to the otherItem's active connection area
        var ptr = otherItem.activeConnectionArea.ptr,
            role = CONSTANTS.CONN_ACCEPTING,
            connArea,
            fromItem,
            nextItem = null;

        if(otherItem.activeConnectionArea.role === CONSTANTS.CONN_ACCEPTING) {
            role = CONSTANTS.CONN_PASSING;
        }

        //TODO Select the correct area for connArea
        if(ptr instanceof Array){//Find the closest compatible area
            var ptrs = ptr,
                shortestDistance,
                i = ptrs.length;
            while (i--){
                connArea = this.getConnectionArea(ptrs[i], role);

                if (connArea && (!shortestDistance || this.__getDistanceBetweenConnections(connArea, 
                            otherItem.activeConnectionArea) < shortestDistance)){
                                shortestDistance = this.__getDistanceBetweenConnections(connArea, 
                                    otherItem.activeConnectionArea)
                                ptr = ptrs[i];
                }
            }

        }

        connArea = this.getConnectionArea(ptr, role);

        //If the active area is occupied, try to splice this item in between
        //fromItem is the item at the end of the set of items to be spliced in
        //nextItem is the item for fromItem to be connected to
        /*
        if (otherItem.isOccupied(otherItem.activeConnectionArea.id)){
            nextItem = otherItem.conn2Item[otherItem.activeConnectionArea.id];

            //Get fromItem
            var oppRole = otherItem.activeConnectionArea.role,
                next = this,
                connId;

            while (fromItem === undefined){
                connId = next.getConnectionArea(ptr, oppRole).id;

                if (connId && next.conn2Item[connId]){
                    next = next.conn2Item[connId];
                }else{
                    fromItem = next;
                }
            }
        }
        */

        this._connect({ ptr: ptr,
                        role: role,
                        area1: connArea,
                        area2: otherItem.activeConnectionArea,
                        otherItem: otherItem });

    };

    ClickableItem.prototype._connect = function (params) {
        //Connect this item to another item given the connection areas
        assert(params.area1 && params.area2, "Connection Areas must both be defined");

        var distance = this._getDistance(params.area1, params.area2),
            otherItem = params.otherItem,
            ptr = params.ptr,
            role = params.role;

        //resize as necessary. May need to resize after connecting
        if (params.resize !== false){
            if (role === CONSTANTS.CONN_ACCEPTING){
                otherItem._updateSize(ptr, this);
            } else {
                this._updateSize(ptr, otherItem);
            }
        }

        this.moveByWithDependents(distance.dx, distance.dy);

        this.setPtr(ptr, role, otherItem);

        //record the connection
        otherItem.conn2Item[params.area2.id] = this;
        this.conn2Item[params.area1.id] = otherItem;

        otherItem.item2Conn[this.id] = params.area2.id;
        this.item2Conn[otherItem.id] = params.area1.id;
    };

    ClickableItem.prototype.updateSizeAndPosition = function () {
        //Resize and connect to it's incoming connection
        var ptrs = Object.keys(this.ptrs[CONSTANTS.CONN_ACCEPTING]), 
            ptr = ptrs.pop(),
            connArea = this.getConnectionArea(ptr, CONSTANTS.CONN_ACCEPTING),
            otherItem = this.canvas.items[this.ptrs[CONSTANTS.CONN_ACCEPTING][ptr]];

        if(ptrs.length){
            this.logger.error("Item " + this.id + " has " + (ptrs.length + 1) + " incoming connections...");
        }

        this._connect({ ptr: ptr,
                        role: CONSTANTS.CONN_ACCEPTING,
                        area1: connArea,
                        area2: otherItem.getConnectionArea(ptr, CONSTANTS.CONN_PASSING),
                        otherItem: otherItem });

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

        if(area === null){//no connection area of specified type
            return null;
        }

        area.parentId = this.id;
        return this._makeConnAreaAbsolute(area);
    };

    ClickableItem.prototype._makeConnAreaAbsolute = function (area) {
        area.x1 += this.positionX;
        area.y1 += this.positionY;
        area.x2 += this.positionX;
        area.y2 += this.positionY;

        //Make sure it is inside the box
        var box = this.getBoundingBox();
        if(box.height > 0 && box.width > 0){//If the box has been rendered
            if(area.x1 >= box.x && area.x2 <= box.x2 && area.y1 >= box.y && area.y2 <= box.y2)
               this.logger.debug("Connection Area is outside the clickable item's bounding box");
        }

        return area;
    };

    ClickableItem.prototype.onHover = function (event) {
            //this._decoratorInstance.displayConnectionArea('next', 'out');
    };

    ClickableItem.prototype.onUnHover = function (event) {
            //this._decoratorInstance.hideConnectionAreas();
    };

    ClickableItem.prototype.getClosestConnectionArea = function (draggedItem, position) {
        //Calculate the closest connection area
        //Return the area and distance
        this.deactivateConnectionAreas();

        //Get all empty pointers and compare with draggedItem's available pointers.
        //Closest compatible pointers determines the active conn area
        var shift = { x: position.left - draggedItem.positionX,
                      y: position.top - draggedItem.positionY },
            openAreas = this.getConnectionAreas(),
            closestArea = null,
            closestIndex = null,
            i,
            otherArea,
            ptrs,
            role;

        i = openAreas.length;
        while (i--){
            //Remove any occupied areas
            if (this.conn2Item[openAreas[i].id]){
                openAreas.splice(i,1);
            }
        }

        i = openAreas.length;
        //Check to find the closest pair of connection areas
        while (i--){
            ptrs = openAreas[i].ptr instanceof Array ?
                openAreas[i].ptr.slice() : [openAreas[i].ptr];
            role = openAreas[i].role === CONSTANTS.CONN_ACCEPTING ? 
                CONSTANTS.CONN_PASSING : CONSTANTS.CONN_ACCEPTING;

            while(ptrs.length){
                otherArea = draggedItem.getConnectionArea(ptrs.pop(), role);

                if(otherArea){

                    //Shift the area
                    otherArea.x1 += shift.x;
                    otherArea.x2 += shift.x;
                    otherArea.y1 += shift.y;
                    otherArea.y2 += shift.y;

                    if (!closestIndex 
                            || this.__getDistanceBetweenConnections(openAreas[i], otherArea) < closestArea){
                        closestIndex = i;
                        closestArea = this.__getDistanceBetweenConnections(openAreas[i], otherArea);
                    }
                }
            }
        }

        return { area: openAreas[closestIndex], distance: closestArea };
    };

    /*
    ClickableItem.prototype.updateHighlight = function (draggedItem, position) {
        //Determine the active connection area
        //First, remove any old stuff
        this.deactivateConnectionAreas();

        //Get all empty pointers and compare with draggedItem's available pointers.
        //Closest compatible pointers determines the active conn area
        var shift = { x: position.left - draggedItem.positionX,
                      y: position.top - draggedItem.positionY },
            openAreas = this.getConnectionAreas(),
            closestArea = null,
            closestIndex = null,
            i,
            otherArea,
            ptrs,
            role;

        i = openAreas.length;
        while (i--){
            //Remove any occupied areas
            if (this.conn2Item[openAreas[i].id]){
                openAreas.splice(i,1);
            }
        }

        i = openAreas.length;
        //Check to find the 
        while (i--){
            ptrs = openAreas[i].ptr instanceof Array ?
                openAreas[i].ptr.slice() : [openAreas[i].ptr];
            role = openAreas[i].role === CONSTANTS.CONN_ACCEPTING ? 
                CONSTANTS.CONN_PASSING : CONSTANTS.CONN_ACCEPTING;

            while(ptrs.length){
                otherArea = draggedItem.getConnectionArea(ptrs.pop(), role);

                if(otherArea && !otherArea.occupied
                        && (!closestIndex || this.__getDistanceBetweenConnections(openAreas[i], otherArea, shift))){
                            closestIndex = i;
                            closestArea = this.__getDistanceBetweenConnections(openAreas[i], otherArea, shift);
                        }
            }
        }

        //Activate the connection area
        if(closestIndex !== null){
            this.setActiveConnectionArea(openAreas[closestIndex]);
            return true;
        }
        return false;
    };
    */

    ClickableItem.prototype.__getDistanceBetweenConnections = function (area1, area2) {
        //Get the distance between connection areas
        //measuring from the centers
        
        var x1 = (area1.x2 + area1.x1)/2,
            x2 = (area2.x2 + area2.x1)/2,
            y1 = (area1.y2 + area1.y1)/2,
            y2 = (area2.y2 + area2.y1)/2;

        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    ClickableItem.prototype.setActiveConnectionArea = function (area) {
        this.activeConnectionArea = area;
        this._decoratorInstance.displayConnectionArea(this.activeConnectionArea.id);
    };

    ClickableItem.prototype.deactivateConnectionAreas = function () {
        this.activeConnectionArea = null;
        this._decoratorInstance.hideConnectionAreas();
    };

    ClickableItem.prototype.moveByWithDependents = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);

        var dependents = Object.keys(this.ptrs[CONSTANTS.CONN_PASSING]),
            i = dependents.length;

        while (i--){
            this.ptrs[CONSTANTS.CONN_PASSING][dependents[i]].moveByWithDependents(dX, dY);
        };
    };

    ClickableItem.prototype.moveBy = function (dX, dY) {
        //Moving a clickable item will also move any of the 'next' pointers
        this.moveTo(this.positionX + dX, this.positionY + dY);
    };
    
    ClickableItem.prototype.moveTo = function (posX, posY) {
        var positionChanged = false;
        //check what might have changed

        if (_.isNumber(posX) && _.isNumber(posY)) {
            //location and dimension information
            if (this.positionX !== posX) {
                this.positionX = posX;
                positionChanged = true;
            }

            if (this.positionY !== posY) {
                this.positionY = posY;
                positionChanged = true;
            }

            if (positionChanged) {
                this.$el.css({"left": this.positionX,
                    "top": this.positionY });

                if (!this.isPositionDependent()) {//Only update database if position is independent

                    this.canvas.dispatchEvent(this.canvas.events.ITEM_POSITION_CHANGED, {"ID": this.id,
                        "x": this.positionX,
                        "y": this.positionY});
                }
            }
        }
    };


    //OVERRIDE
    ClickableItem.prototype.update = function (objDescriptor) {
        var needToUpdateDependents = null;

        //check what might have changed
        //update position
        /*if (this.isPositionDependent()){
            //Click the item to it's parent
            var basePtr = Object.keys(this.ptrs[CONSTANTS.CONN_ACCEPTING]);

            assert(basePtr.length === 1);
            basePtr = basePtr.pop();

            this.ptrs[CONSTANTS.CONN_ACCEPTING][basePtr].updateDependents();

        } else */if (!this.isPositionDependent() && objDescriptor.position 
                && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
            var dx = objDescriptor.position.x - this.positionX,
                dy = objDescriptor.position.y - this.positionY;

            //this.moveByWithDependents(dx, dy);
            this.moveTo(objDescriptor.position.x, objDescriptor.position.y);
            needToUpdateDependents = "move";
        }

        var oldMetaInfo = this._decoratorInstance.getMetaInfo();

        //update gmeId if needed
        if(objDescriptor.id && oldMetaInfo[CONSTANTS.GME_ID] 
           && oldMetaInfo[CONSTANTS.GME_ID] !== objDescriptor.id){
            console.log("Changing " + oldMetaInfo[CONSTANTS.GME_ID] + " to " + objDescriptor.id);
            this._decoratorInstance.setGmeId(objDescriptor.id);
            this.$el.html(this._decoratorInstance.$el);
            needToUpdateDependents = "changed id";
        }

        //update decorator if needed
        if (objDescriptor.decoratorClass && this._decoratorID !== objDescriptor.decoratorClass.prototype.DECORATORID) {
            needToUpdateDependents = "decorator";

            this.logger.debug("decorator update: '" + this._decoratorID + "' --> '" + objDescriptor.decoratorClass.prototype.DECORATORID + "'...");

            var oldControl = this._decoratorInstance.getControl();

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

        return needToUpdateDependents;
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
