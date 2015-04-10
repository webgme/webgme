/*globals define, _, WebGMEGlobal*/

/*
 * @author brollb / https://github/brollb
 */

define(['js/logger',
        './BlockEditorWidget.Constants',
        './ItemBase'], function (Logger,
                                 BLOCK_CONSTANTS,
                                 ItemBase) {

    "use strict";

    var LinkableItem,
        DEBUG = false,
        NAME = "linkable-item";
    
    /**
     * LinkableItem
     *
     * @constructor
     * @param {String} objId
     * @param {BlockWidget} canvas
     * @return {undefined}
     */
    LinkableItem = function(objId, canvas){
        ItemBase.prototype.initialize.call(this, NAME, objId, canvas);

        //Logger
        this.logger = Logger.create('gme:Widgets:BlockEditor:LinkableItem_' + this.id,
            WebGMEGlobal.gmeConfig.client.log);

        //Linkable items that depend on this one for location
        //That is, the child nodes and the 'next' ptr
        this._metaPtrs = {};//Used for cleaning connections
        this.parent = null;
        this.ptrs = {};

        this.conn2Item = {};//item connected to sorted by connection area id
        this.item2Conn = {};
        this.activeConnectionArea = null;

        //Attributes (may be displayed in the svg)
        this.attributes = {};

        //Input field info
        this.inputFieldsToUpdate = {};
        this.updatedAttributes = [];
        
        //Coloring
        this._color = BLOCK_CONSTANTS.COLOR_PRIMARY;

        //Size info
        this._actualWidth = null;
        this._actualHeight = null;
    };

    _.extend(LinkableItem.prototype, ItemBase.prototype);

    LinkableItem.prototype.$_DOMBase = $('<div/>').attr({ "class": BLOCK_CONSTANTS.DESIGNER_ITEM_CLASS });

    /* * * * * * * * * * * * * ATTRIBUTES * * * * * * * * * * * * */ 
    /**
     * Update attributes of this object
     *
     * @param {Object} attrInfo
     * @return {undefined}
     */
    LinkableItem.prototype.updateAttributes = function (attrInfo) {
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
    LinkableItem.prototype.updateDisplayedAttributeText = function () {
        var attributeName,
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
    LinkableItem.prototype.getAttribute = function (attributeName) {
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
    LinkableItem.prototype.getAttributeNames = function () {
        return Object.keys(this.attributes);
    };

    /**
     * Get enumeration options of an attribute or null if not an enumeration
     *
     * @private
     * @param {String} attributeName
     * @return {Array|null} Enumeration options
     */
    LinkableItem.prototype._getAttributeOptions = function (attributeName) {
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
    LinkableItem.prototype.updatePtrs = function (ptrInfo) {
        //Update the OUT pointers given a dictionary of ptrs
        //Will need to update the other item as well
        var ptrs = Object.keys(ptrInfo),
            oldPtrs = Object.keys(this.ptrs),
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
                    this.setPtr(ptr, ptrInfo[ptr]);
                    changed = "added ptr";
                } else {
                    //Check that the pointer is correct
                    if (this.ptrs[ptr].id !== ptrInfo[ptr].id){
                        this.removePtr(ptr);

                        this.setPtr(ptr, ptrInfo[ptr]);
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
            this.removePtr(ptr);
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
    LinkableItem.prototype.isPositionDependent = function () {
        return this.parent !== null;
    };

    /**
     * Set this item's pointer to the givenitem
     *
     * @param {String} ptr
     * @param {LinkableItem} item
     */
    LinkableItem.prototype.setPtr = function (ptr, item) {
        var outgoingConn = this.getConnectionArea({ptr: ptr, role: BLOCK_CONSTANTS.CONN_OUTGOING}),
            incomingConn = item.getConnectionArea({role: BLOCK_CONSTANTS.CONN_INCOMING});

        //Make sure it is a valid 'move'
        if (item === this){
            this.logger.error("Should never set a pointer to itself");
        }

        //Removing any existing value
        this.removePtr(ptr);

        item.parent = this;
        this.ptrs[ptr] = item;

        //Update the colors of the attaching item
        item.updateColors();
        this._decoratorInstance.setAttributeEnabled(ptr, false);

        //Record the connections used
        if (outgoingConn && incomingConn){
            item.conn2Item[incomingConn.id] = this;
            this.conn2Item[outgoingConn.id] = item;

            item.item2Conn[this.id] = incomingConn.id;
            this.item2Conn[item.id] = outgoingConn.id;
        }
    };

    /**
     * Get the pointer names of this item
     *
     * @return {Array} pointer names
     */
    LinkableItem.prototype.getPtrNames = function () {
        //Get ptrNames from outgoing connection areas
        var areas = this.getConnectionAreas(),
            ptrs = [];

        for (var i = areas.length-1; i >= 0; i--) {
            if (areas[i].role === BLOCK_CONSTANTS.CONN_OUTGOING) {
                ptrs.push(areas[i].ptr);
            }
        }

        return ptrs;
    };

    /**
     * Check if the item has the given pointer (does not need to be occupied)
     *
     * @param {String} ptr
     * @return {Boolean}
     */
    LinkableItem.prototype.hasPtr = function (ptr) {
        var ptrNames = this.getPtrNames();

        return ptrNames.indexOf(ptr) !== -1;
    };

    /**
     * Remove the given pointer (with the given role) from the item
     *
     * @param {String} ptr
     * @param {String} role
     * @param {Boolean} resize
     */
    LinkableItem.prototype.removePtr = function (ptr, resize) {
        //remove pointers and resize
        var item = this.ptrs[ptr];

        if (!item){//If the ptr is empty, ignore
            return;
        }

        if(resize === true){
            this._updateSize(ptr, null);
        }
        
        //Update decorator to show attributes with given name
        this._decoratorInstance.setAttributeEnabled(ptr, true);
        
        delete this.ptrs[ptr];

        //free the connections
        if (!this._freeConnRecord(ptr)) {
            if (item.parent === this) {
                item.parent = null;
            }
        }
    };

    /**
     * Free the record of the connection area-item association.
     *
     * @param {LinkableItem} item
     * @param {String} ptr
     * @return {Boolean} True if the item is still connected to "this"
     */
    LinkableItem.prototype._freeConnRecord = function (ptr) {
        var connId = this.getConnectionArea({ptr: ptr, 
                                             role: BLOCK_CONSTANTS.CONN_OUTGOING}).id,
            item = this.conn2Item[connId],
            stillConnected = connId !== this.item2Conn[item.id];

        this.conn2Item[connId] = undefined;

        if (!stillConnected) {                    // Ignore if the item has simply moved
            this.item2Conn[item.id] = undefined;  // to another connection of the item
            item.item2Conn[this.id] = undefined;

            connId = item.item2Conn[this.id];

            if (item.conn2Item[connId] === this) {
                item.conn2Item[connId] = undefined;
            }
        }

        return stillConnected;

    };

    LinkableItem.prototype.getPtrFromItem = function (itemId) {
        var connId = this.item2Conn[itemId],
            conn = this._decoratorInstance.getConnectionArea({id: connId}),
            ptr = null;

        if (conn){
            ptr = conn.ptr;
        }

        return ptr;
    };

    /**
     * Remove any connection areas that are not in ptrs
     *
     * @param {Array} ptrs
     * @return {undefined}
     */
    LinkableItem.prototype.cleanConnectionAreas = function (ptrs) {
        this._decoratorInstance.cleanConnections(ptrs);
    };

    /* * * * * * * * * * * * * END POINTERS * * * * * * * * * * * * */ 
    /* * * * * * * * * * * * * INPUT FIELDS * * * * * * * * * * * * */ 
    /**
     * Update the input fields that need to be updated
     *
     * @return {undefined}
     */
    LinkableItem.prototype.getInputFieldUpdates = function () {
        this.inputFieldsToUpdate = this._decoratorInstance.getInputFieldUpdates();
    };

    /**
     * Update the item's input fields
     *
     * @return {undefined}
     */
    LinkableItem.prototype.updateInputFields = function () {
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
                if (this.inputFieldsToUpdate[field].type === BLOCK_CONSTANTS.DROPDOWN.NAME){

                    if (this.inputFieldsToUpdate[field].content === BLOCK_CONSTANTS.DROPDOWN.CONTENT.META_ENUM){
                        //dropdown contains enumeration defined in the meta
                        options = this._getAttributeOptions(field);
                    } else {
                        targetItem = this.getItemAtConnId(this.getConnectionArea({ptr: targetPointer, role:  BLOCK_CONSTANTS.CONN_OUTGOING}).id);

                        if (targetItem){

                            if (this.inputFieldsToUpdate[field].content === BLOCK_CONSTANTS.DROPDOWN.CONTENT.POINTERS){
                                options = targetItem.getPtrNames();
                            } else if (this.inputFieldsToUpdate[field].content === BLOCK_CONSTANTS.DROPDOWN.CONTENT.ATTRIBUTES){
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
    LinkableItem.prototype.setColor = function () {
        var changed = false;

        if (this.parent){
            if (this.parent.getColor()){
                //Need to check if they have the same svg or svg color. If so, check whether
                //the item is set to it's PRIMARY or SECONDARY color and set this one accordingly
                changed = this._decoratorInstance.setColor(this.parent.getColor());
            }
        }

        return changed;
    };

    LinkableItem.prototype.getColor = function () {
        return this._decoratorInstance.getColor();
    };

    /**
     * Update this object and all children objects as long as their colors are being changed
     *
     */
    LinkableItem.prototype.updateColors = function () {
        if(this.setColor()){
            //update the colors of dependents
            var dependentKeys = Object.keys(this.ptrs),
                i = dependentKeys.length;
            while (i--){
                this.ptrs[dependentKeys[i]].updateColors();
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
    LinkableItem.prototype.isOccupied = function (connId) {
        return this.conn2Item[connId] !== undefined;
    };

    /**
     * Get the item linked to the given connection area
     *
     * @param {String} connId
     * @return {LinkableItem|null}
     */
    LinkableItem.prototype.getItemAtConnId = function (connId) {
        return this.conn2Item[connId];
    };

    /**
     * Get the LinkableItems dependent on this item sorted by "children"
     * and "sibling" pointers
     *
     * @return {Object} 
     */
    LinkableItem.prototype.getDependentsByType = function () {
        //Return sibling/non-sibling dependents
        var result = { siblings: [], children: [] },
            ptrs = Object.keys(this.ptrs),
            ptr;

        for (var i = ptrs.length-1; i >= 0; i--) {
            ptr = ptrs[i];

            if (BLOCK_CONSTANTS.SIBLING_PTRS.indexOf(ptr) === -1){
                result.children.push(this.ptrs[ptr].id);
            } else {
                result.siblings.push(this.ptrs[ptr].id);
            }
        }

        return result;
    };

    /**
     * Get all dependent items of this item
     *
     * @return {Array}
     */
    LinkableItem.prototype.getDependents = function () {
        var deps = [],
            keys = Object.keys(this.ptrs);

        for (var i = keys.length-1; i >= 0; i--) {
            deps.push(this.ptrs[keys[i]]);
        }

        return deps;
    };

    /**
     * Get the size of the object and the dependents
     *
     * @return {Number}
     */
    LinkableItem.prototype.getTotalSize = function () {
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

    //Override
    /**
     * Get the bounding box of the item
     *
     * @return {Object}
     */
    LinkableItem.prototype.getBoundingBox = function () {
        var box;

        //Update the decorator if needed
        if (this._decoratorInstance.updateSize){
            this._decoratorInstance.updateSize();
        }

        box = {"x": this.positionX,
               "y": this.positionY,
               "width": this._width,
               "height": this._height};

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

    
    /**
     * Update the size of the item. 
     *
     * Includes fix for the jquery zoom bug caused by incorrect 
     * handling of "transform: scale" css in jquery
     *
     * @return {undefined}
     *
     */
    LinkableItem.prototype.setSize = function (w, h) {
        var changed = false;

        if (_.isNumber(w) && _.isNumber(h)) {
            if (this._width !== w) {
                this._width = w;
                changed = true;
            }

            if (this._height !== h) {
                this._height = h;
                changed = true;
            }

            if (changed === true) {
                this.canvas.dispatchEvent(this.canvas.events.ITEM_SIZE_ChANGED, {"ID": this.id,
                    "w": this._width,
                    "h": this._height});
            }
        }

        this.updateZoom(this.canvas._zoomRatio);
    };

    /**
     * Update the size of the container wrt the zoom.
     *
     * @param {Number} zoom
     * @return {boolean} changed
     */
    LinkableItem.prototype.updateZoom = function(zoom) {
        var oldWidth = this._actualWidth,
            oldHeight = this._actualHeight;

        this._actualWidth = this._width*zoom;
        this._actualHeight = this._height*zoom;

        return oldWidth !== this._actualWidth || oldHeight !== this._actualHeight;  // true if it changed
    };


    /******************** ALTER SVG  *********************/
    /**
     * Update size based on all 'out' pointers 
     *
     * @return {Boolean} return true if the item changed size
     */
    LinkableItem.prototype.updateSize = function () {
        var ptrs = this.getPtrNames(),
            ptr,
            attrs = this.getAttributeNames(),
            combinedNames = {},
            names,
            changed = false,
            i;

        for (i = ptrs.length-1; i >= 0; i--) {
            combinedNames[ptrs[i]] = true;
        }

        for (i = attrs.length-1; i >= 0; i--) {
            combinedNames[attrs[i]] = true;
        }

        names = Object.keys(combinedNames);
        if(names.length){
            i = names.length;
            while(i--){
                changed = this._updateSize(names[i], this.ptrs[names[i]]) || changed;
            }
        }

        this._decoratorInstance.updateShifts();

        return changed;
    };

    /**
     * Update the size of this item with respect to the given ptr and item
     *
     * @private
     * @param {String} ptrName
     * @param {LinkableItem} item
     * @return {Boolean} return true if size has changed
     */
    LinkableItem.prototype._updateSize = function (ptrName, item) {
        var box = item ? item.getTotalSize() : null,
            changed = false;

        if (BLOCK_CONSTANTS.SIBLING_PTRS.indexOf(ptrName) === -1){
            //stretch the decorator 
            if (box === null){
                box = { width: 0, height: 0 };//set the box to 0,0 so the decorator has a valid object to resize

            } 

            changed = this._decoratorInstance.stretchTo(ptrName, { x: box.width, y: box.height });
        }
        return changed;
    };

    /**
     * Connect this item to it's parent
     *
     * @return {undefined}
     */
    LinkableItem.prototype.updatePosition = function () {
        var params = { ignoreDependents: true, resize: false },
            ptr;

        if (this.isPositionDependent()) {
            ptr = this.parent.item2Conn[this.id].ptr;
            this.parent.connectByPointerName(this, ptr, params);
        }
    };

    /**
     * Reconnect all the pointers that are going out of this item
     *
     * @return {undefined}
     */
    LinkableItem.prototype.updateDependents = function (params) {
        var ptrs = Object.keys(this.ptrs),
            i = ptrs.length;

        while (i--){
            if (params.hasOwnProperty("propogate")){
                if (params.propogate === true){
                    this.ptrs[ptrs[i]].updateDependents(params);
                }

                delete params.propogate;
            }

            this.connectByPointerName(this.ptrs[ptrs[i]], ptrs[i], params);
        }
    };

    /**
     * Connect this item to another item by moving this item
     *
     * @param {LinkableItem} otherItem
     * @param {String} ptrName
     * @param {String} role
     * @param {Boolean} resize
     */
    LinkableItem.prototype.connectByPointerName = function (otherItem, ptr, extraParams) {
        
        var incomingConn = otherItem.getConnectionArea({role: BLOCK_CONSTANTS.CONN_INCOMING}),
            outgoingConn = this.getConnectionArea({ptr: ptr, role: BLOCK_CONSTANTS.CONN_OUTGOING}),
            params = { ptr: ptr,
                       incomingConn: incomingConn,
                       outgoingConn: outgoingConn,
                       otherItem: otherItem };
                        

        if (_.isObject(extraParams)){
            _.extend(params, extraParams);
        }

        if (incomingConn && outgoingConn){
            this._connect(params);
        }

    };

    /**
     * Connect an item to this item given the connection areas
     *
     * @private
     * @param {Object} params
     */
    LinkableItem.prototype._connect = function (options) {
        var distance = this._getDistance(options.incomingConn, options.outgoingConn),
            item = options.otherItem,
            ptr = options.ptr,
            params = { resize: true,
                       ignoreDependents: false };

        _.extend(params, options);

        if (!(params.incomingConn && params.outgoingConn)){
            this.logger.error("Connection Areas must both be defined");
        }

        //resize as necessary. May need to resize after connecting
        if (params.resize){
            this._updateSize(ptr, item);
        }

        if (params.ignoreDependents){
            item.moveBy(distance.dx, distance.dy);
        } else {
            item.moveByWithDependents(distance.dx, distance.dy);
        }

        this.setPtr(ptr, item);

        //Update input fields
        this.updateInputFields();
    };

    /**
     * Resize and connect to it's incoming connection
     *
     */
    LinkableItem.prototype.updateSizeAndPosition = function () {
        var connArea = this.getConnectionArea({role: BLOCK_CONSTANTS.CONN_INCOMING}),
            otherItem = this.parent,
            ptr = this.parent.item2Conn[this.id].ptr;

        this._connect({ ptr: ptr,
                        incomingConn: connArea,
                        outgoingConn: otherItem.getConnectionArea({ptr: ptr, role: BLOCK_CONSTANTS.CONN_OUTGOING}),
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
    LinkableItem.prototype._getDistance = function (connArea1, connArea2) {//Move first to second
        var c1 = { x: (connArea1.x2 + connArea1.x1)/2,//center of first area
            y: (connArea1.y2 + connArea1.y1)/2 },
            c2 = { x: (connArea2.x2 + connArea2.x1)/2,//center of second area
                y: (connArea2.y2 + connArea2.y1)/2 },
            dx = c2.x - c1.x,
            dy = c2.y - c1.y;

        return { dx: dx, dy: dy };
    };

    /**
     * Returns connection areas with relative locations.
     *
     * @return {Array} Connection Areas
     */
    LinkableItem.prototype.getRelativeConnectionAreas = function () {
        var areas = this._decoratorInstance.getConnectionAreas();
        for (var i = areas.length-1; i >= 0; i--) {
            areas[i].parentId = this.id;
        }

        return areas;
    };

    LinkableItem.prototype.getRelativeFreeConnectionAreas = function () {
        var result = [],
            areas = this.getRelativeConnectionAreas();

            for (var i = areas.length-1; i >= 0; i--) {
                if (!this.conn2Item[areas[i].id]) {
                    result.push(areas[i]);
                }
            }

        return result;
    };

    /**
     * Get all the item's connection areas
     *
     * @return {Object} Connection Areas
     */
    LinkableItem.prototype.getConnectionAreas = function () {
        var areas = this.getRelativeConnectionAreas();
        return this._makeConnAreasAbsolute(areas);
    };

    LinkableItem.prototype.getFreeConnectionAreas = function () {
        var areas = this.getRelativeFreeConnectionAreas();
        return this._makeConnAreasAbsolute(areas);
    };

    //Convenience method
    /**
     * Get the connection area for the given role, pointer
     *
     * @param {Object} params to match in connection area
     * @return {Object}
     */
    LinkableItem.prototype.getConnectionArea = function (params) {
        var area;

        area = this._decoratorInstance.getConnectionArea(params);
        if (area === null) {  // no connection area of specified type
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
    LinkableItem.prototype._makeConnAreaAbsolute = function (area) {
        area.x1 += this.positionX;
        area.y1 += this.positionY;
        area.x2 += this.positionX;
        area.y2 += this.positionY;

        //Make sure it is inside the box
        var box = this.getBoundingBox();
        if(box.height > 0 && box.width > 0){//If the box has been rendered
            if(area.x1 >= box.x && area.x2 <= box.x2 && area.y1 >= box.y && area.y2 <= box.y2){
               this.logger.debug("Connection Area is outside the linkable item's bounding box");
            }
        }

        return area;
    };

    // Convenience method
    LinkableItem.prototype._makeConnAreasAbsolute = function (areas) {
        for (var i = areas.length-1; i >= 0; i--) {
            areas[i] = this._makeConnAreaAbsolute(areas[i]);
        }
        return areas;
    };

    /**
     * Get the distance between this 'out' role (w/ given ptr) and the
     * dst object.
     *
     * @param {Object} options (keys: dst, ptr)
     * @return {Object} distance (dx, dy)
     */
    LinkableItem.prototype.getConnectionDistance = function (options) {
        var connArea = this.getConnectionArea({ptr: options.ptr, role:  BLOCK_CONSTANTS.CONN_OUTGOING}),
            item = options.dst,
            otherArea = item.getConnectionArea({role: BLOCK_CONSTANTS.CONN_INCOMING});

        return this._getDistance(connArea, otherArea);
    };

    /**
     * Get the distance between connection areas measuring from the centers
     *
     * @private
     * @param {Object} area1
     * @param {Object} area2
     * @return {Number} distance between connection areas
     */
    LinkableItem.prototype.__getDistanceBetweenConnections = function (area1, area2) {
        var x1 = (area1.x2 + area1.x1)/2,
            x2 = (area2.x2 + area2.x1)/2,
            y1 = (area1.y2 + area1.y1)/2,
            y2 = (area2.y2 + area2.y1)/2;

        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    LinkableItem.prototype.setActiveConnectionArea = function (area) {
        this.activeConnectionArea = area;
        this._decoratorInstance.displayConnectionArea(this.activeConnectionArea.id);
    };

    LinkableItem.prototype.deactivateConnectionAreas = function () {
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
    LinkableItem.prototype.moveByWithDependents = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);

        var dependents = Object.keys(this.ptrs),
            i = dependents.length;

        while (i--){
            this.ptrs[dependents[i]].moveByWithDependents(dX, dY);
        }
    };

    /**
     * Move the item by the given amount.
     *
     * @param {Number} dX
     * @param {Number} dY
     * @return {undefined}
     */
    LinkableItem.prototype.moveBy = function (dX, dY) {
        this.moveTo(this.positionX + dX, this.positionY + dY);
    };
    
    /**
     * Move the item to the given x,y position.
     *
     * @param {Number} posX
     * @param {Number} posY
     * @return {undefined}
     */
    LinkableItem.prototype.moveTo = function (posX, posY) {
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

    /**
     * Update the attributes in the decorator and WRITE changes to the DOM.
     *
     * @return {undefined}
     */
    LinkableItem.prototype.renderSetTextInfo = function () {
        //Update the attributes of the svg
        this.updateDisplayedAttributeText();

        //Trigger an attribute update in the decorator
        this._decoratorInstance.updateAttributeText();

    };

    // Override
    LinkableItem.prototype.renderSetLayoutInfo = function () {
        // Set the width, height of $el to account for zoom
        this.applySizeContainerInfo();
        this._callDecoratorMethod("onRenderSetLayoutInfo");
    };

    /**
     * Apply the recorded size info to the DOM container css.
     *
     * @return {undefined}
     */
    LinkableItem.prototype.applySizeContainerInfo = function () {
        this.$el.css('width', this._actualWidth);
        this.$el.css('height', this._actualHeight);
    };

    //OVERRIDE
    /**
     * Update the item based on the object description
     *
     * @param {Object} objDescriptor
     * @return {Boolean} return true if the dependents need to be updated
     */
    LinkableItem.prototype.update = function (objDescriptor) {
        var needToUpdateDependents = null,
            self = this,
            positionShouldChange = function (newPos){
                if (!self.isPositionDependent() && //If the item cares about it's stored position
                    newPos &&
                    _.isNumber(newPos.x) && 
                    _.isNumber(newPos.y)) {

                    //Check if the position is different from current
                    if (newPos.x !== self.positionX || newPos.y !== self.positionY){
                        return true;
                    }
                }

                return false;
            };

        //check what might have changed
        //update position
        if (positionShouldChange(objDescriptor.position)){
            this.moveTo(objDescriptor.position.x, objDescriptor.position.y);
            needToUpdateDependents = "move";
        }

        //update the decorator's input area fields' values
        this.updateInputFields();
        this.updateDisplayedAttributeText();

        var oldMetaInfo = this._decoratorInstance.getMetaInfo();

        //update gmeId if needed
        if(objDescriptor.id && oldMetaInfo[BLOCK_CONSTANTS.GME_ID] && oldMetaInfo[BLOCK_CONSTANTS.GME_ID] !== objDescriptor.id){
            this.logger.debug("Changing " + oldMetaInfo[BLOCK_CONSTANTS.GME_ID] + " to " + objDescriptor.id);
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
    LinkableItem.prototype.registerSubcomponent = function (subComponentId, metaInfo) {
        this.logger.debug("registerSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.registerSubcomponent(this.id, subComponentId, metaInfo);
    };

    LinkableItem.prototype.unregisterSubcomponent = function (subComponentId) {
        this.logger.debug("unregisterSubcomponent - ID: '" + this.id + "', SubComponentID: '" + subComponentId + "'");
        this.canvas.unregisterSubcomponent(this.id, subComponentId);
    };

    LinkableItem.prototype.registerConnectors = function (el, subComponentId) {
        el.attr(BLOCK_CONSTANTS.DATA_ITEM_ID, this.id);
        if (subComponentId !== undefined && subComponentId !== null) {
            el.attr(BLOCK_CONSTANTS.DATA_SUBCOMPONENT_ID, subComponentId);
        }
    };

    LinkableItem.prototype.updateSubcomponent = function (subComponentId) {
        //let the decorator instance know about the update
        this._decoratorInstance.updateSubcomponent(subComponentId);
    };

    /******************** HIGHLIGHT / UNHIGHLIGHT MODE *********************/
    LinkableItem.prototype.highlight = function () {
        this.$el.addClass(BLOCK_CONSTANTS.ITEM_HIGHLIGHT_CLASS);
    };

    LinkableItem.prototype.unHighlight = function () {
        this.$el.removeClass(BLOCK_CONSTANTS.ITEM_HIGHLIGHT_CLASS);
    };

    LinkableItem.prototype.doSearch = function (searchDesc) {
        return this._decoratorInstance.doSearch(searchDesc);
    };

    LinkableItem.prototype.onItemComponentEvents = function (eventList) {
        this._decoratorInstance.notifyComponentEvent(eventList);
    };

    return LinkableItem;
});
