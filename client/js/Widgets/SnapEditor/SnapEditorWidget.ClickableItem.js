/*globals define,_*/
/*
 * @author brollb / https://github/brollb
 */

define(['./ClickableItem',
        './SnapEditorWidget.Constants'], function (ClickableItem,
                                                   CONSTANTS) {
    "use strict";

    var SnapEditorWidgetClickableItems;

    SnapEditorWidgetClickableItems = function () {

    };

    SnapEditorWidgetClickableItems.prototype.createClickableItem = function (objD) {
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
        this._insertedClickableItemIDs.push(componentId);

        newComponent = this.items[componentId] = new ClickableItem(componentId, this);
        newComponent.moveTo(objDescriptor.position.x, objDescriptor.position.y);

        //Store Attributes
        newComponent.updateAttributes(objDescriptor.attrInfo);

        newComponent.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, objDescriptor.control, objDescriptor.metaInfo, objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);
        newComponent.addToDocFragment(this._documentFragment);

        //Set Pointers/Connections
        newComponent.cleanConnectionAreas(Object.keys(objDescriptor.ptrs));
        newComponent.updatePtrs(objDescriptor.ptrs);

        //set the item to be able to be "clicked" to with drag'n'drop
        this.setClickable(newComponent);

        this._clickableItems2Update[componentId] = "created";

        return newComponent;
    };

    SnapEditorWidgetClickableItems.prototype._alignPositionToGrid = function (pX, pY) {
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

        return { "x": pX,
            "y": pY };
    };

    SnapEditorWidgetClickableItems.prototype.updateClickableItem  = function (componentId, objDescriptor) {
        var alignedPosition,
            addToUpdateList = null,
            item;

        if (this.itemIds.indexOf(componentId) !== -1) {
            this.logger.debug("Updating model component with parameters: " + objDescriptor);
            item = this.items[componentId];

            //Update pointers
            if (objDescriptor.hasOwnProperty("ptrInfo")){
                addToUpdateList = item.updatePtrs(objDescriptor.ptrInfo) || addToUpdateList;
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
            this._updatedClickableItemIDs.push(componentId);

            addToUpdateList = this.items[componentId].update(objDescriptor) || addToUpdateList;

            if (addToUpdateList){
                this._clickableItems2Update[componentId] = addToUpdateList;
            }
        }
    };

    SnapEditorWidgetClickableItems.prototype.deleteClickableItem  = function (id) {
        var idx;

        this.logger.debug("Deleting ClickableItem with ID: '" + id + "'");

        //keep up accounting
        this._deletedClickableItemIDs.push(id);

        idx = this.itemIds.indexOf(id);
        this.itemIds.splice(idx, 1);

        this.items[id].destroy();
        delete this.items[id];
    };

    //NOTE: could/should be overridden in the CONTROLLER
    SnapEditorWidgetClickableItems.prototype.onClickableItemDoubleClick = function (id, event) {
        this.logger.debug("ClickableItem '" + id + "' received double click at pos: [" + event.offsetX + ", " + event.offsetY + "]");
    };

    SnapEditorWidgetClickableItems.prototype.notifyItemComponentEvents = function (itemId, eventList) {
        if (this.itemIds.indexOf(itemId) !== -1) {
            this._updatedClickableItemIDs.push(itemId);
            this.items[itemId].onItemComponentEvents(eventList);
        }
    };

    SnapEditorWidgetClickableItems.prototype.connect = function (id1, id2) {
        //This connects connArea1 and connArea2 on the screen as being connected. That is
        //it positions the parents of connArea1 and connArea2 such that connArea1 and connArea2
        //are overlapping and centered on each other.
        //
        //Note: This is done by moving connArea2 to connArea1.
        var item1 = this.items[id1],
            item2 = this.items[id2];

        item1.connectToActive(item2);
    };

    SnapEditorWidgetClickableItems.prototype.setToConnect = function (id1, id2, ptrName) {
        //This sets the pointers for the relevant ids and sizes them but does not move them
        var item1 = this.items[id1],
            item2 = this.items[id2];

        item2.setPtr(ptrName, CONSTANTS.CONN_ACCEPTING, item1);
    };

    SnapEditorWidgetClickableItems.prototype.updateItemDependents = function (id1, ptrName) {
        this.items[id1].updateDependents();
    };

    SnapEditorWidgetClickableItems.prototype.itemHasPtr = function (id1, ptrName) {
        return this.items[id1].hasPtr(ptrName);
    };

    SnapEditorWidgetClickableItems.prototype.getItemsPointingTo = function (id) {
        var item = this.items[id],
            result = {};

        _.extend(result, item.ptrs[CONSTANTS.CONN_ACCEPTING]);

        return result;
    };

    SnapEditorWidgetClickableItems.prototype.removePtr = function (itemId, ptr, role) {
        this.items[itemId].removePtr(ptr, role, true);
    };

    return SnapEditorWidgetClickableItems;
});
