/*globals define,_*/

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['logManager',
        './SnapEditorWidget.Constants',
        'util/assert',
        './ItemBase'], function (logManager,
                                       SNAP_CONSTANTS,
                                       assert,
                                       ItemBase) {

    "use strict";

    var ClickableItem,
        NAME = "clickable-item";
    
    /**
     * ClickableItem
     *
     * @constructor
     * @param {String} objId
     * @param {SnapWidget} canvas
     * @return {undefined}
     */
    ClickableItem = function(objId, canvas){
        this._super(NAME, objId, canvas);

        //Clickable items that depend on this one for location
        //That is, the child nodes and the 'next' ptr
        this._metaPtrs = {};//Used for cleaning connections
        this.ptrs = {};
        this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING] = {};
        this.ptrs[SNAP_CONSTANTS.CONN_PASSING] = {};

        this.conn2Item = {};//item connected to sorted by connection area id
        this.item2Conn = {};
        this.ptrNames = null;
        this.activeConnectionArea = null;

        //Attributes (may be displayed in the svg)
        this.attributes = {};

        //Input field info
        this.inputFieldsToUpdate = {};
        this.updatedAttributes = [];
        
        //Coloring
        this._color = SNAP_CONSTANTS.COLOR_PRIMARY;

        //Size info
        this._calculatedSize = {};
    };

    _.extend(ClickableItem.prototype, ItemBase.prototype);

    ClickableItem.prototype.$_DOMBase = $('<div/>').attr({ "class": SNAP_CONSTANTS.DESIGNER_ITEM_CLASS });

    /* * * * * * * * * * * * * ATTRIBUTES * * * * * * * * * * * * */ 
    /**
     * Update attributes of this object
     *
     * @param {Object} attrInfo
     * @return {undefined}
     */
    ClickableItem.prototype.updateAttributes = function (attrInfo) {
        var newAttributeNames = Object.keys(attrInfo),
            oldAttributeNames = Object.keys(this.attributes),
            attr,
            i,
            changed = null;

        while (newAttributeNames.length){
            attr = newAttributeNames.pop();
            if (!_.isEqual(this.attributes[attr], attrInfo[attr])){
                this.attributes[attr] = attrInfo[attr];
                changed = "set attribute";
                this.updatedAttributes.push(attr);
            }

            i = oldAttributeNames.indexOf(attr);
            if (i !== -1){
                oldAttributeNames.splice(i,1);
            }
        }

        while (oldAttributeNames.length){
            attr = newAttributeNames.pop();
            delete this.attributes[attr];
            changed = "removed attr";
            this.updatedAttributes.push(attr);
        }

        return changed;
    };

    /**
     * Notify SVG of updated attributes 
     *
     * @return {undefined}
     */
    ClickableItem.prototype.updateDisplayedAttributeText = function () {
        var attributes = this.updatedAttributes,
            attributeName,
            value;

        while (this.updatedAttributes.length){
            attributeName = this.updatedAttributes.pop();
            value = this.getAttribute(attributeName);
            if ( value !== null){
                this._decoratorInstance.updateAttributeContent(attributeName, value);
            } else {
                this._decoratorInstance.removeAttributeText(attributeName);
            }
        }
    };

    /**
     * Get an attribute of the item by name.
     *
     * @param {String} attributeName
     * @return {String|null} attribute
     */
    ClickableItem.prototype.getAttribute = function (attributeName) {
        if (this.attributes[attributeName]){
            return this.attributes[attributeName].value;
        }
        return null;
    };

    /**
     * Get all attributes associated with this item.
     *
     * @return {Array}
     */
    ClickableItem.prototype.getAttributeNames = function () {
        return Object.keys(this.attributes);
    };

    /**
     * Get enumeration options of an attribute or null if not an enumeration
     *
     * @private
     * @param {String} attributeName
     * @return {Array|null} Enumeration options
     */
    ClickableItem.prototype._getAttributeOptions = function (attributeName) {
        return this.attributes[attributeName].options || null;
    };

    /* * * * * * * * * * * * * END ATTRIBUTES * * * * * * * * * * * * */ 

    /* * * * * * * * * * * * * POINTERS * * * * * * * * * * * * */ 
    /**
     * Update the items pointers
     *
     * @param {Object} ptrInfo
     * @return {Boolean} return true if the pointers have been changed
     */
    ClickableItem.prototype.updatePtrs = function (ptrInfo) {
        //Update the OUT pointers given a dictionary of ptrs
        //Will need to update the other item as well
        var ptrs = Object.keys(ptrInfo),
            oldPtrs = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_PASSING]),
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
                    otherItem.setPtr(ptr, SNAP_CONSTANTS.CONN_ACCEPTING, this);
                    changed = "added ptr";
                } else {
                    //Check that the pointer is correct
                    if (this.ptrs[SNAP_CONSTANTS.CONN_PASSING][ptr].id !== ptrInfo[ptr]){
                        oldItem = this.ptrs[SNAP_CONSTANTS.CONN_PASSING][ptr];
                        oldItem.removePtr(ptr, SNAP_CONSTANTS.CONN_ACCEPTING, false);

                        otherItem = this.canvas.items[ptrInfo[ptr]];
                        otherItem.setPtr(ptr, SNAP_CONSTANTS.CONN_ACCEPTING, this);
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
            this.removePtr(ptr, SNAP_CONSTANTS.CONN_PASSING, false);
            changed = "removed ptr";
        }

        if (changed === "removed ptr"){
            this.cleanConnectionAreas(ptrs);
        }

        return changed;
    };

    /**
     * Check if this item's position is dependent on another
     *
     * @return {Boolean} 
     */
    ClickableItem.prototype.isPositionDependent = function () {
        return Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING]).length !== 0;
    };

    /**
     * Set this item's pointer with the given role to "item"
     *
     * @param {String} ptr
     * @param {String} role
     * @param {ClickableItem} item
     */
    ClickableItem.prototype.setPtr = function (ptr, role, item) {
        var otherRole = role === SNAP_CONSTANTS.CONN_ACCEPTING ? 
                SNAP_CONSTANTS.CONN_PASSING : SNAP_CONSTANTS.CONN_ACCEPTING;

        assert(item !== this, "Should never set a pointer to itself");

        if (this.ptrs[role][ptr]){
            this.removePtr(ptr, role);
        }

        this.ptrs[role][ptr] = item;
        item.ptrs[otherRole][ptr] = this;

        //Update the colors of the attaching item
        if (role === SNAP_CONSTANTS.CONN_PASSING){
            item.updateColors();
            this._decoratorInstance.setAttributeEnabled(ptr, false);
        } else {
            this.updateColors();
            item._decoratorInstance.setAttributeEnabled(ptr, false);
        }

    };

    /**
     * Disconnect all pointers with the given role from this object
     *
     * @param {String} role
     */
    ClickableItem.prototype.disconnectPtrs = function (role) {
        //Disconnect the incoming or outgoing pointers and 
        var keys = Object.keys(this.ptrs[role]),
            ptr;

        while (keys.length){
            ptr = keys.pop();

            this.removePtr(ptr, role);
        }
    };

    /**
     * Get the pointer names of this item
     *
     * @return {Array} pointer names
     */
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

    /**
     * Check if the item has the given pointer (does not need to be occupied)
     *
     * @param {String} ptr
     * @return {Boolean}
     */
    ClickableItem.prototype.hasPtr = function (ptr) {
        if(this.ptrNames === null){
            this.ptrNames = this.getPtrNames();
        }

        return this.ptrNames.indexOf(ptr) !== -1;
    };

    /**
     * Remove the given pointer (with the given role) from the item
     *
     * @param {String} ptr
     * @param {String} role
     * @param {Boolean} resize
     */
    ClickableItem.prototype.removePtr = function (ptr, role, resize) {
        //remove pointers and resize
        var item = this.ptrs[role][ptr],
            otherRole = role === SNAP_CONSTANTS.CONN_ACCEPTING ? 
                SNAP_CONSTANTS.CONN_PASSING : SNAP_CONSTANTS.CONN_ACCEPTING,
            attribute;

        if(resize === true){
            if (role === SNAP_CONSTANTS.CONN_ACCEPTING){
                item._updateSize(ptr, null);
            } else {
                this._updateSize(ptr, null);
            }
        }
        
        //Update decorator to show attributes with given name
        if (role === SNAP_CONSTANTS.CONN_PASSING){
            this._decoratorInstance.setAttributeEnabled(ptr, true);
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

    /**
     * Remove any connection areas that are not in ptrs
     *
     * @param {Array} ptrs
     * @return {undefined}
     */
    ClickableItem.prototype.cleanConnectionAreas = function (ptrs) {
        this._decoratorInstance.cleanConnections(ptrs);
    };

    /* * * * * * * * * * * * * END POINTERS * * * * * * * * * * * * */ 
    /* * * * * * * * * * * * * INPUT FIELDS * * * * * * * * * * * * */ 
    /**
     * Update the input fields that need to be updated
     *
     * @return {undefined}
     */
    ClickableItem.prototype.getInputFieldUpdates = function () {
        this.inputFieldsToUpdate = this._decoratorInstance.getInputFieldUpdates();
    };

    /**
     * Update the item's input fields
     *
     * @return {undefined}
     */
    ClickableItem.prototype.updateInputFields = function () {
        this.getInputFieldUpdates();

        var fields = Object.keys(this.inputFieldsToUpdate),
            field,
            content,
            targetPointer,
            targetItem,
            visible,
            options,
            changed = false;

        for (var i = fields.length - 1; i >= 0; i--){
            field = fields[i];
            if (this.isOccupied(field)){
                visible = false;
            } else {//Update info for input field
                content = this.getAttribute[field];
                visible = true;
                options = null;
                targetPointer = this.inputFieldsToUpdate[field].target;

                //Get additional options
                if (this.inputFieldsToUpdate[field].type === SNAP_CONSTANTS.DROPDOWN.NAME){

                    if (this.inputFieldsToUpdate[field].content === SNAP_CONSTANTS.DROPDOWN.CONTENT.META_ENUM){
                        //dropdown contains enumeration defined in the meta
                        options = this._getAttributeOptions(field);
                    } else {
                        targetItem = this.getItemAtConnId(this.getConnectionArea(targetPointer, SNAP_CONSTANTS.CONN_PASSING).id);

                        if (targetItem){

                            if (this.inputFieldsToUpdate[field].content === SNAP_CONSTANTS.DROPDOWN.CONTENT.POINTERS){
                                options = targetItem.getPtrNames();
                            } else if (this.inputFieldsToUpdate[field].content === SNAP_CONSTANTS.DROPDOWN.CONTENT.ATTRIBUTES){
                                options = targetItem.getAttributeNames();
                            }
                        } else {
                            options = [ "N/A" ];
                        }

                    }

                    if (!content){
                        content = '--' + this.inputFieldsToUpdate[field].content + '--';
                        options.splice(0,0, content);//prepend empty string
                    }
                }
                changed = this._decoratorInstance.updateInputField(field, content, options) || changed;
            }

            this._decoratorInstance.setInputFieldVisibility(field, visible);
        }

        //If we changed an input field, update it!
        this._decoratorInstance.updateInputFields();
    };

    /* * * * * * * * * * * * * END INPUT FIELDS * * * * * * * * * * * * */ 
    /* * * * * * * * * * * * * COLORING * * * * * * * * * * * * */ 
    /**
     * Set the color of the given item based on the item it is attached to
     * @return {undefined}
     *
     */
    ClickableItem.prototype.setColor = function () {
        var keys = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING]),
            changed = false;

        if (keys.length){

            var basePtr = keys[0],
                base = this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING][basePtr],
                baseColor = base.getColor();


            //If the item has more than one object pointing in, then we won't know
            //for sure where to place it as the object pointing in determines
            //the item's location
            assert(keys.length === 1, "Item should have only one object pointing into it");

            if (baseColor){
                //Need to check if they have the same svg or svg color. If so, check whether
                //the item is set to it's PRIMARY or SECONDARY color and set this one accordingly
                changed = this._decoratorInstance.setColor(base.getColor());
            }
        }

        return changed;
    };

    ClickableItem.prototype.getColor = function () {
        return this._decoratorInstance.getColor();
    };

    /**
     * Update this object and all children objects as long as their colors are being changed
     *
     */
    ClickableItem.prototype.updateColors = function () {
        if(this.setColor()){
            //update the colors of dependents
            var dependentKeys = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_PASSING]),
                i = dependentKeys.length;
            while (i--){
                this.ptrs[SNAP_CONSTANTS.CONN_PASSING][dependentKeys[i]].updateColors();
            }
        }
    };

    /* * * * * * * * * * * * * CONNECTIONS * * * * * * * * * * * * */ 

    /**
     * Check if the connection with the given id is occupied
     *
     * @param {String} connId
     * @return {Boolean}
     */
    ClickableItem.prototype.isOccupied = function (connId) {
        return this.conn2Item[connId] !== undefined;
    };

    /**
     * Get the item clicked to the given connection area
     *
     * @param {String} connId
     * @return {ClickableItem|null}
     */
    ClickableItem.prototype.getItemAtConnId = function (connId) {
        return this.conn2Item[connId];
    };

    /**
     * Get the item connected to the "next" pointer
     *
     * @return {ClickableItem}
     */
    ClickableItem.prototype.getNextItem = function () {
        return this.ptrs[SNAP_CONSTANTS.CONN_PASSING][SNAP_CONSTANTS.PTR_NEXT];
    };

    /**
     * Get the ClickableItems dependent on this item sorted by "children"
     * and "sibling" pointers
     *
     * @return {Object} 
     */
    ClickableItem.prototype.getDependentsByType = function () {
        //Return sibling/non-sibling dependents
        var result = { siblings: [], children: [] },
            ptrs = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_PASSING]),
            ptr;

        while (ptrs.length){
            ptr = ptrs.pop();

            if (SNAP_CONSTANTS.SIBLING_PTRS.indexOf(ptr) === -1){
                result.children.push(this.ptrs[SNAP_CONSTANTS.CONN_PASSING][ptr].id);
            } else {
                result.siblings.push(this.ptrs[SNAP_CONSTANTS.CONN_PASSING][ptr].id);
            }
        }

        return result;
    };

    /**
     * Get the ClickableItem that this item is attached to 
     *
     * @return {ClickableItem|null}
     */
    ClickableItem.prototype.getParent = function () {
        //get parent in dependency tree
        var ptrs = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING]),
            result = null;

            assert(ptrs.length <= 1, "Item should have only one object pointing into it");

            if (ptrs.length === 1){
                result = this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING][ptrs.pop()];
            }

            return result;
    };

    /**
     * Get all dependent items of this item
     *
     * @return {Array}
     */
    ClickableItem.prototype.getDependents = function () {
        var deps = [],
            keys = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_PASSING]);

        while (keys.length){
            deps.push(this.ptrs[SNAP_CONSTANTS.CONN_PASSING][keys.pop()]);
        }

        return deps;
    };

    /**
     * Get the size of the object and the dependents
     *
     * @return {Number}
     */
    ClickableItem.prototype.getTotalSize = function () {
        var result = this.getBoundingBox(),
            deps = this.getDependentsByType().siblings,
            siblings,
            box,
            dependent;

        while (deps.length){
            dependent = this.canvas.items[deps.pop()];
            box = dependent.getBoundingBox();

            //add the dependent to the total size
            result.x = Math.min(result.x, box.x);
            result.x2 = Math.max(result.x2, box.x2);
            result.y = Math.min(result.y, box.y);
            result.y2 = Math.max(result.y2, box.y2);

            //Add all siblings of the dependent -- BFS
            siblings = dependent.getDependentsByType().siblings;
            if (siblings){
                deps = deps.concat(siblings);
            }
        }

        //update width, height
        result.width = result.x2 - result.x;
        result.height = result.y2 - result.y;

        return result;
    };

    /**
     * Clear and stored size info.
     *
     * @return {undefined}
     */
    ClickableItem.prototype.clearCalculatedSize = function () {
        //this.setSize(this._calculatedSize.width, this._calculatedSize.height);
        this._calculatedSize = {};
    };

    /**
     * Size calculated but not rendered yet.
     *
     * @param {Number} size
     * @return {undefined}
     */
    ClickableItem.prototype.setCalculatedSize = function (size) {
        for (var dim in size){
            if (size.hasOwnProperty(dim)){
                this._calculatedSize[dim] = size[dim];
            }
        }
    };

    //Override
    /**
     * Get the bounding box of the item
     *
     * @return {Object}
     */
    ClickableItem.prototype.getBoundingBox = function () {
        var box = {"x": this.positionX,
                "y": this.positionY,
                "width": this._width,
                "height": this._height},
            calculatedDims = Object.keys(this._calculatedSize),
            dim;

        //Use the calculated width if they have it...
        while (calculatedDims.length){
            dim = calculatedDims.pop();
            box[dim] = this._calculatedSize[dim];
        }

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

        //Calculate x2, y2
        box.x2 = box.x + box.width;
        box.y2 = box.y + box.height;

        return box;
    };

    /******************** ALTER SVG  *********************/
    /**
     * Update size based on all pointers 
     *
     * @return {Boolean} return true if the item changed size
     */
    ClickableItem.prototype.updateSize = function () {
        //
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
                changed = this._updateSize(ptrs[i], this.ptrs[SNAP_CONSTANTS.CONN_PASSING][ptrs[i]]) || changed;
            }
        }

        return changed;
    };

    /**
     * Update the size of this item with respect to the given ptr and item
     *
     * @private
     * @param {String} ptrName
     * @param {ClickableItem} item
     * @return {Boolean} return true if size has changed
     */
    ClickableItem.prototype._updateSize = function (ptrName, item) {
        var box = item ? item.getTotalSize() : null;

        if (SNAP_CONSTANTS.SIBLING_PTRS.indexOf(ptrName) === -1){
            //stretch the decorator 
            if (box === null){
                //if there is an attribute of the same name
                var attribute = this.getAttribute(ptrName);
                if (attribute){
                    return this._decoratorInstance.updateText(ptrName, attribute);
                } else {//set the box to 0,0 so the decorator has a valid object to resize
                    box = { width: 0, height: 0 };
                }
            } 
            return this._decoratorInstance.stretchTo(ptrName, { x: box.width, y: box.height });
        }
        return false;//return if it changed
    };

    /**
     * Connect this item to it's parent
     *
     * @return {undefined}
     */
    ClickableItem.prototype.updatePosition = function () {
        var ptrs = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING]),
            params = { ignoreDependents: true, resize: false };//extra params

        assert(ptrs.length <= 1, "An item can only be connected to one other item");

        if (this.isPositionDependent()){
            this.connectByPointerName(this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING][ptrs[0]], 
                                      ptrs[0], SNAP_CONSTANTS.CONN_ACCEPTING, params);
        }
    };

    /**
     * Reconnect all the pointers that are going out of this item
     *
     * @return {undefined}
     */
    ClickableItem.prototype.updateDependents = function (propogate) {
        var ptrs = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_PASSING]),
            i = ptrs.length;

        while (i--){
            this.ptrs[SNAP_CONSTANTS.CONN_PASSING][ptrs[i]]
                .connectByPointerName(this, ptrs[i], SNAP_CONSTANTS.CONN_ACCEPTING);

            if (propogate === true){
                this.ptrs[SNAP_CONSTANTS.CONN_PASSING][ptrs[i]].updateDependents(propogate);
            }
        }
    };

    /**
     * Connect this item to another item by moving this item
     *
     * @param {ClickableItem} otherItem
     * @param {String} ptrName
     * @param {String} role
     * @param {Boolean} resize
     */
    ClickableItem.prototype.connectByPointerName = function (otherItem, ptrName, role, extraParams) {
        
        var otherRole = role === SNAP_CONSTANTS.CONN_ACCEPTING ? //Get the opposite role
                SNAP_CONSTANTS.CONN_PASSING : SNAP_CONSTANTS.CONN_ACCEPTING,
            connArea1 = this.getConnectionArea(ptrName, role),
            connArea2 = otherItem.getConnectionArea(ptrName, otherRole),
            params = { ptr: ptrName,
                        role: SNAP_CONSTANTS.CONN_ACCEPTING,
                        area1: connArea1,
                        area2: connArea2,
                        otherItem: otherItem };
                        

        if (_.isObject(extraParams)){
            _.extend(params, extraParams);
        }

        if (connArea1 && connArea2){
            this._connect(params);
        }

    };

    /**
     * Connect this item to the otherItem's active connection area
     *
     * @param {ClickableItem} otherItem
     */
    ClickableItem.prototype.connectToActive = function (otherItem) {
        var ptr = otherItem.activeConnectionArea.ptr,
            role = SNAP_CONSTANTS.CONN_ACCEPTING,
            connArea,
            fromItem,
            nextItem = null;

        if(otherItem.activeConnectionArea.role === SNAP_CONSTANTS.CONN_ACCEPTING) {
            role = SNAP_CONSTANTS.CONN_PASSING;
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
                                    otherItem.activeConnectionArea);
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

    /**
     * Connect this item to another item given the connection areas
     *
     * @private
     * @param {Object} params
     */
    ClickableItem.prototype._connect = function (params) {
        //
        assert(params.area1 && params.area2, "Connection Areas must both be defined");

        var distance = this._getDistance(params.area1, params.area2),
            otherItem = params.otherItem,
            ptr = params.ptr,
            role = params.role;

        //resize as necessary. May need to resize after connecting
        if (params.resize !== false){
            if (role === SNAP_CONSTANTS.CONN_ACCEPTING){
                otherItem._updateSize(ptr, this);
            } else {
                this._updateSize(ptr, otherItem);
            }
        }

        if (params.ignoreDependents === true){
            this.moveBy(distance.dx, distance.dy);
        } else {
            this.moveByWithDependents(distance.dx, distance.dy);
        }

        this.setPtr(ptr, role, otherItem);

        //record the connection
        otherItem.conn2Item[params.area2.id] = this;
        this.conn2Item[params.area1.id] = otherItem;

        otherItem.item2Conn[this.id] = params.area2.id;
        this.item2Conn[otherItem.id] = params.area1.id;

        //Update input fields
        this.updateInputFields();
        otherItem.updateInputFields();
    };

    /**
     * Resize and connect to it's incoming connection
     *
     */
    ClickableItem.prototype.updateSizeAndPosition = function () {
        var ptrs = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING]), 
            ptr = ptrs.pop(),
            connArea = this.getConnectionArea(ptr, SNAP_CONSTANTS.CONN_ACCEPTING),
            otherItem = this.canvas.items[this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING][ptr]];

        if(ptrs.length){
            this.logger.error("Item " + this.id + " has " + (ptrs.length + 1) + " incoming connections...");
        }

        this._connect({ ptr: ptr,
                        role: SNAP_CONSTANTS.CONN_ACCEPTING,
                        area1: connArea,
                        area2: otherItem.getConnectionArea(ptr, SNAP_CONSTANTS.CONN_PASSING),
                        otherItem: otherItem });

    };

    /**
     * Get the distance between the connection areas
     *
     * @private
     * @param {Object} connArea1
     * @param {Object} connArea2
     * @return {Number} distance
     */
    ClickableItem.prototype._getDistance = function (connArea1, connArea2) {//Move first to second
        var c1 = { x: (connArea1.x2 + connArea1.x1)/2,//center of first area
            y: (connArea1.y2 + connArea1.y1)/2 },
            c2 = { x: (connArea2.x2 + connArea2.x1)/2,//center of second area
                y: (connArea2.y2 + connArea2.y1)/2 },
            dx = c2.x - c1.x,
            dy = c2.y - c1.y;

        return { dx: dx, dy: dy };
    };

    /**
     * Get all the item's connection areas
     *
     * @return {Object} Connection Areas
     */
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
    /**
     * Get the connection area for the given role, pointer
     *
     * @param {String} ptr
     * @param {String} role
     * @return {Object}
     */
    ClickableItem.prototype.getConnectionArea = function (ptr, role) {
        var area = this._decoratorInstance.getConnectionArea(ptr, role);

        if(area === null){//no connection area of specified type
            return null;
        }

        area.parentId = this.id;
        return this._makeConnAreaAbsolute(area);
    };

    /**
     * Change the connection area's position to absolute
     *
     * @private
     * @param {Object} area
     * @return {Object} adjusted connection area
     */
    ClickableItem.prototype._makeConnAreaAbsolute = function (area) {
        area.x1 += this.positionX;
        area.y1 += this.positionY;
        area.x2 += this.positionX;
        area.y2 += this.positionY;

        //Make sure it is inside the box
        var box = this.getBoundingBox();
        if(box.height > 0 && box.width > 0){//If the box has been rendered
            if(area.x1 >= box.x && area.x2 <= box.x2 && area.y1 >= box.y && area.y2 <= box.y2){
               this.logger.debug("Connection Area is outside the clickable item's bounding box");
            }
        }

        return area;
    };

    ClickableItem.prototype.onHover = function (event) {
            //this._decoratorInstance.displayConnectionArea('next', 'out');
    };

    ClickableItem.prototype.onUnHover = function (event) {
            //this._decoratorInstance.hideConnectionAreas();
    };

    /**
     * Calculate the closest compatible connection areas and distance.
     *
     * @param {ClickableItem} draggedItem
     * @param {Object} position
     * @return {Object} distance and connection area of closest
     */
    ClickableItem.prototype.getClosestConnectionArea = function (draggedItem, position) {
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

        /*
         * Used before "splicing" capabilities were supported
         *
         */
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
            role = openAreas[i].role === SNAP_CONSTANTS.CONN_ACCEPTING ? 
                SNAP_CONSTANTS.CONN_PASSING : SNAP_CONSTANTS.CONN_ACCEPTING;

            while(ptrs.length){
                otherArea = draggedItem.getConnectionArea(ptrs.pop(), role);

                if(otherArea){

                    //Shift the area
                    otherArea.x1 += shift.x;
                    otherArea.x2 += shift.x;
                    otherArea.y1 += shift.y;
                    otherArea.y2 += shift.y;

                    if (!closestIndex || this.__getDistanceBetweenConnections(openAreas[i], otherArea) < closestArea){
                        closestIndex = i;
                        closestArea = this.__getDistanceBetweenConnections(openAreas[i], otherArea);
                    }
                }
            }
        }

        return { area: openAreas[closestIndex], distance: closestArea };
    };

    /**
     * Get the distance between connection areas measuring from the centers
     *
     * @private
     * @param {Object} area1
     * @param {Object} area2
     * @return {Number} distance between connection areas
     */
    ClickableItem.prototype.__getDistanceBetweenConnections = function (area1, area2) {
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

    /**
     * Move the current item by dx, dy with it's dependents.
     *
     * @param {Number} dX
     * @param {Number} dY
     * @return {undefined}
     */
    ClickableItem.prototype.moveByWithDependents = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);

        var dependents = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_PASSING]),
            i = dependents.length;

        while (i--){
            this.ptrs[SNAP_CONSTANTS.CONN_PASSING][dependents[i]].moveByWithDependents(dX, dY);
        }
    };

    /**
     * Move the item by the given amount.
     *
     * @param {Number} dX
     * @param {Number} dY
     * @return {undefined}
     */
    ClickableItem.prototype.moveBy = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);
    };
    
    /**
     * Move the item to the given x,y position.
     *
     * @param {Number} posX
     * @param {Number} posY
     * @return {undefined}
     */
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
    /**
     * Update the item based on the object description
     *
     * @param {Object} objDescriptor
     * @return {Boolean} return true if the dependents need to be updated
     */
    ClickableItem.prototype.update = function (objDescriptor) {
        var needToUpdateDependents = null;

        //check what might have changed
        //update position
        /*if (this.isPositionDependent()){
            //Click the item to it's parent
            var basePtr = Object.keys(this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING]);

            assert(basePtr.length === 1);
            basePtr = basePtr.pop();

            this.ptrs[SNAP_CONSTANTS.CONN_ACCEPTING][basePtr].updateDependents();

        } else */if (!this.isPositionDependent() && objDescriptor.position && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
            var dx = objDescriptor.position.x - this.positionX,
                dy = objDescriptor.position.y - this.positionY;

            //this.moveByWithDependents(dx, dy);
            this.moveTo(objDescriptor.position.x, objDescriptor.position.y);
            needToUpdateDependents = "move";
        }

        //update the decorator's input area fields' values
        this.updateInputFields();
        this.updateDisplayedAttributeText();

        var oldMetaInfo = this._decoratorInstance.getMetaInfo();

        //update gmeId if needed
        if(objDescriptor.id && oldMetaInfo[SNAP_CONSTANTS.GME_ID] && oldMetaInfo[SNAP_CONSTANTS.GME_ID] !== objDescriptor.id){
            console.log("Changing " + oldMetaInfo[SNAP_CONSTANTS.GME_ID] + " to " + objDescriptor.id);
            this._decoratorInstance.setGmeId(objDescriptor.id);
            this.$el.html(this._decoratorInstance.$el);
            needToUpdateDependents = "changed id";
        }

        //update decorator if needed
        if (objDescriptor.decoratorClass && this._decoratorID !== objDescriptor.decoratorClass.prototype.DECORATORID) {
            needToUpdateDependents = "decorator changed";

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
            if (this._decoratorInstance.update()){
                needToUpdateDependents = "decorator resized";
            }
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
        el.attr(SNAP_CONSTANTS.DATA_ITEM_ID, this.id);
        if (subComponentId !== undefined && subComponentId !== null) {
            el.attr(SNAP_CONSTANTS.DATA_SUBCOMPONENT_ID, subComponentId);
        }
    };

    ClickableItem.prototype.updateSubcomponent = function (subComponentId) {
        //let the decorator instance know about the update
        this._decoratorInstance.updateSubcomponent(subComponentId);
    };

    /*********************** CONNECTION END CONNECTOR HIGHLIGHT ************************/

    /*
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
   */

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
        this.$el.addClass(SNAP_CONSTANTS.ITEM_HIGHLIGHT_CLASS);
    };

    ClickableItem.prototype.unHighlight = function () {
        this.$el.removeClass(SNAP_CONSTANTS.ITEM_HIGHLIGHT_CLASS);
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
