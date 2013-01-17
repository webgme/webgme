"use strict";

define(['js/DiagramDesigner/DesignerItem',
        'js/DiagramDesigner/DefaultDecorator'   /*load the default decorator just to make sure it's here for sure*/
        ], function (DesignerItem,
                     DefaultDecorator) {

    var DesignerCanvasDesignerItem,
        DEFAULT_DECORATOR_NAME = "DefaultDecorator",
        DEFAULT_DECORATOR_CLASS = DefaultDecorator;

    DesignerCanvasDesignerItem = function () {

    };

    DesignerCanvasDesignerItem.prototype.createDesignerItem = function (objD) {
        var componentId = this.getGuid("I_"),
            objDescriptor = _.extend({}, objD),
            newComponent,
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

        this.logger.debug("Creating model component with id: '" + componentId + "'");

        objDescriptor.designerCanvas = this;
        objDescriptor.position.x = alignedPosition.x;
        objDescriptor.position.y = alignedPosition.y;
        objDescriptor.guid = componentId;

        this._checkPositionOverlap(componentId, objDescriptor);

        this.itemIds.push(componentId);

        //add to accounting queues for performance optimization
        this._insertedDesignerItemIDs.push(componentId);

        newComponent = this.items[componentId] = new DesignerItem(componentId);
        newComponent._initialize(objDescriptor);
        newComponent.addToDocFragment(this._documentFragment);

        return newComponent;
    };

    DesignerCanvasDesignerItem.prototype.updateDesignerItem  = function (componentId, objDescriptor) {
        var alignedPosition;

        if (this.itemIds.indexOf(componentId) !== -1) {
            this.logger.debug("Updating model component with parameters: " + objDescriptor);

            //adjust its position to this canvas
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

            objDescriptor.position.x = alignedPosition.x;
            objDescriptor.position.y = alignedPosition.y;

            this._checkPositionOverlap(componentId, objDescriptor);

            //add to accounting queues for performance optimization
            this._updatedDesignerItemIDs.push(componentId);

            this.items[componentId].update(objDescriptor);
        }
    };

    DesignerCanvasDesignerItem.prototype.deleteDesignerItem  = function (id) {
        var idx;

        this.logger.debug("Deleting DesignerItem with ID: '" + id + "'");

        //keep up accounting
        this._deletedDesignerItemIDs.push(id);

        idx = this.itemIds.indexOf(id);
        this.itemIds.splice(idx, 1);

        this.items[id].destroy();
        delete this.items[id];
    };

    return DesignerCanvasDesignerItem;
});
