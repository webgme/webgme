"use strict";

define(['./ClickableItem'], function (ClickableItem) {

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

        this._checkPositionOverlap(componentId, objDescriptor);

        this.itemIds.push(componentId);

        //add to accounting queues for performance optimization
        this._insertedClickableItemIDs.push(componentId);

        newComponent = this.items[componentId] = new ClickableItem(componentId, this);
        newComponent.moveTo(objDescriptor.position.x, objDescriptor.position.y);
        newComponent.rotateTo(objDescriptor.rotation);

        newComponent.__setDecorator(objDescriptor.decorator, objDescriptor.decoratorClass, objDescriptor.control, objDescriptor.metaInfo, objDescriptor.preferencesHelper, objDescriptor.aspect, objDescriptor.decoratorParams);
        newComponent.addToDocFragment(this._documentFragment);

        return newComponent;
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

    return SnapEditorWidgetClickableItems;
});
