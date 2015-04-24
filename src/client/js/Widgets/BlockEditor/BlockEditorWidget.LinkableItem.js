/*globals define, _*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define(['./LinkableItem',
    './BlockEditorWidget.Constants'], function (LinkableItem,
                                                CONSTANTS) {
    "use strict";

    var BlockEditorWidgetLinkableItems;

    BlockEditorWidgetLinkableItems = function () {

    };

    BlockEditorWidgetLinkableItems.prototype.createLinkableItem = function (objD) {
        var componentId = this._getGuid(),
            objDescriptor = _.extend({}, objD),
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y),
            newComponent;

        this.logger.debug("Creating model component with id: '" + componentId + "'");

        objDescriptor.designerCanvas = this;
        objDescriptor.position.x = alignedPosition.x;
        objDescriptor.position.y = alignedPosition.y;
        objDescriptor.guid = componentId;

        //this._checkPositionOverlap(componentId, objDescriptor);

        this.itemIds.push(componentId);

        //add to accounting queues for performance optimization
        this._insertedLinkableItemIDs.push(componentId);

        newComponent = this.items[componentId] = new LinkableItem(componentId, this);
        newComponent.moveTo(objDescriptor.position.x, objDescriptor.position.y);

        //Store Attributes
        newComponent.updateAttributes(objDescriptor.attrInfo);

        //Pass ptrs to decorator
        var attrs = Object.keys(objDescriptor.attrInfo),
            ptrs = Object.keys(objDescriptor.ptrInfo),
            stretchers = attrs.concat(ptrs);

        objDescriptor.decoratorParams = {stretchers: stretchers};

        newComponent.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, objDescriptor.control, objDescriptor.metaInfo, objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);
        newComponent.addToDocFragment(this._documentFragment);

        //Set Pointers/Connections
        var ptrInfo = this._createPtrInfoObject(objDescriptor.ptrInfo);
        newComponent.updatePtrs(ptrInfo);
        newComponent.updateInputFields();
        newComponent.updateDisplayedAttributeText();

        //set the item to be able to be "clicked" to with drag'n'drop
        this.setLinkable(newComponent);

        this._linkableItems2Update[componentId] = "created";

        return newComponent;
    };

    BlockEditorWidgetLinkableItems.prototype._alignPositionToGrid = function (pX, pY) {
        var posXDelta,
            posYDelta;

        if (pX < this.gridSize) {
            pX = this.gridSize;
        }

        if (pY < this.gridSize) {
            pY = this.gridSize;
        }

        if (this.gridSize > 1) {
            posXDelta = pX % this.gridSize;
            posYDelta = pY % this.gridSize;

            if ((posXDelta !== 0) || (posYDelta !== 0)) {
                pX += (posXDelta < Math.floor(this.gridSize / 2) + 1 ? -1 * posXDelta : this.gridSize - posXDelta);
                pY += (posYDelta < Math.floor(this.gridSize / 2) + 1 ? -1 * posYDelta : this.gridSize - posYDelta);
            }
        }

        return {
            "x": pX,
            "y": pY
        };
    };

    BlockEditorWidgetLinkableItems.prototype.updateLinkableItem = function (componentId, objDescriptor) {
        var alignedPosition,
            addToUpdateList = null,
            item;

        if (this.itemIds.indexOf(componentId) !== -1) {
            this.logger.debug("Updating model component with parameters: " + objDescriptor);
            item = this.items[componentId];

            //Update pointers
            if (objDescriptor.hasOwnProperty("ptrInfo")) {
                var ptrInfo = this._createPtrInfoObject(objDescriptor.ptrInfo);
                addToUpdateList = item.updatePtrs(ptrInfo) || addToUpdateList;
                addToUpdateList = item.updateAttributes(objDescriptor.attrInfo) || addToUpdateList;
            }

            //adjust its position to this canvas
            if (objDescriptor.position && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
                alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

                objDescriptor.position.x = alignedPosition.x;
                objDescriptor.position.y = alignedPosition.y;

                this._checkPositionOverlap(componentId, objDescriptor);
            }

            //add to accounting queues for performance optimization
            this._updatedLinkableItemIDs.push(componentId);

            addToUpdateList = this.items[componentId].update(objDescriptor) || addToUpdateList;

            if (addToUpdateList) {
                this._linkableItems2Update[componentId] = addToUpdateList;
            }
        }
    };

    BlockEditorWidgetLinkableItems.prototype._createPtrInfoObject = function (ptrInfo) {
        // Replace ids with items
        var ids = Object.keys(ptrInfo);

        for (var i = ids.length - 1; i >= 0; i--) {
            ptrInfo[ids[i]] = this.items[ptrInfo[ids[i]]] || ptrInfo[ids[i]];
        }

        return ptrInfo;
    };

    BlockEditorWidgetLinkableItems.prototype.deleteLinkableItem = function (id) {
        var idx;

        this.logger.debug("Deleting LinkableItem with ID: '" + id + "'");

        //keep up accounting
        this._deletedLinkableItemIDs.push(id);

        idx = this.itemIds.indexOf(id);
        this.itemIds.splice(idx, 1);

        this.items[id].destroy();
        delete this.items[id];
    };

    //NOTE: could/should be overridden in the CONTROLLER
    BlockEditorWidgetLinkableItems.prototype.onLinkableItemDoubleClick = function (id, event) {
        this.logger.debug("LinkableItem '" + id + "' received double click at pos: [" + event.offsetX + ", " + event.offsetY + "]");
    };

    BlockEditorWidgetLinkableItems.prototype.notifyItemComponentEvents = function (itemId, eventList) {
        if (this.itemIds.indexOf(itemId) !== -1) {
            this._updatedLinkableItemIDs.push(itemId);
            this.items[itemId].onItemComponentEvents(eventList);
        }
    };

    //BlockEditorWidgetLinkableItems.prototype.connect = function (id1, id2) {
    ////This connects connArea1 and connArea2 on the screen as being connected. That is
    ////it positions the parents of connArea1 and connArea2 such that connArea1 and connArea2
    ////are overlapping and centered on each other.
    ////
    ////Note: This is done by moving connArea2 to connArea1.
    //var item1 = this.items[id1],
    //item2 = this.items[id2];

    //item1.connectToActive(item2);
    //};

    BlockEditorWidgetLinkableItems.prototype.setToConnect = function (id1, id2, ptrName) {
        //This sets the pointers for the relevant ids and sizes them but does not move them
        var item1 = this.items[id1],
            item2 = this.items[id2];

        item1.setPtr(ptrName, item2);
    };

    BlockEditorWidgetLinkableItems.prototype.updateItemDependents = function (id1) {
        this.items[id1].updateDependents();
    };

    //I will need to calculate the distance between objects
    //for when I drop an object to point to the recipient.
    BlockEditorWidgetLinkableItems.prototype.getConnectionDistance = function (options) {
        var src = this.items[options.src];//src has the CONN_OUTGOING role

        delete options.src;
        options.dst = this.items[options.dst];

        return src.getConnectionDistance(options);
    };

    BlockEditorWidgetLinkableItems.prototype.itemHasPtr = function (id1, ptrName) {
        return this.items[id1].hasPtr(ptrName);
    };

    BlockEditorWidgetLinkableItems.prototype.getParentInfo = function (id) {
        var item = this.items[id].parent,
            conn;

        if (!item) {
            return null;
        }

        conn = item.getConnectionArea({id: item.item2Conn[id]});
        return {ptr: conn.ptr, id: item.id};
    };

    BlockEditorWidgetLinkableItems.prototype.removePtr = function (itemId, ptr, role) {
        this.items[itemId].removePtr(ptr, role, true);
    };

    return BlockEditorWidgetLinkableItems;
});
