"use strict";

define(['./ClickableItem',
        './SnapEditorWidget.Constants'], function (ClickableItem,
                                                   CONSTANTS) {

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

        newComponent.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, objDescriptor.control, objDescriptor.metaInfo, objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);
        newComponent.addToDocFragment(this._documentFragment);

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
        var alignedPosition;

        if (this.itemIds.indexOf(componentId) !== -1) {
            this.logger.debug("Updating model component with parameters: " + objDescriptor);

            //adjust its position to this canvas
            if (objDescriptor.position && _.isNumber(objDescriptor.position.x) && _.isNumber(objDescriptor.position.y)) {
                alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

                objDescriptor.position.x = alignedPosition.x;
                objDescriptor.position.y = alignedPosition.y;

                this._checkPositionOverlap(componentId, objDescriptor);
            }

            //add to accounting queues for performance optimization
            this._updatedClickableItemIDs.push(componentId);

            this.items[componentId].update(objDescriptor);
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

    SnapEditorWidgetClickableItems.prototype.connect = function (id1, id2, ptrName) {
        //This connects connArea1 and connArea2 on the screen as being connected. That is
        //it positions the parents of connArea1 and connArea2 such that connArea1 and connArea2
        //are overlapping and centered on each other.
        //
        //Note: This is done by moving connArea2 to connArea1.
        var item1 = this.items[id1],
            item2 = this.items[id2],
            connArea1 = item1.getConnectionArea(ptrName, CONSTANTS.CONN_PASSING),
            connArea2 = item2.getConnectionArea(ptrName, CONSTANTS.CONN_ACCEPTING),
            c1 = { x: (connArea1.x2 + connArea1.x1)/2,//center of first area
                   y: (connArea1.y2 + connArea1.y1)/2 },
            c2 = { x: (connArea2.x2 + connArea2.x1)/2,//center of second area
                   y: (connArea2.y2 + connArea2.y1)/2 },
            dx = c1.x - c2.x,
            dy = c1.y - c2.y;

        item2.base = item1;
        item1.dependents.push(item2);

        item1.setPtrTo(item2, ptrName);
        item2.setPtrFrom(item1, ptrName);

        /*
        if(ptrName === CONSTANTS.PTR_NEXT){
            item1._nextItem = item2;
        }
        */

        item2.moveBy(dx, dy);
    };

    SnapEditorWidgetClickableItems.prototype.itemHasPtr = function (id1, ptrName) {
        return this.items[id1].hasPtr(ptrName);
    };

    return SnapEditorWidgetClickableItems;
});
