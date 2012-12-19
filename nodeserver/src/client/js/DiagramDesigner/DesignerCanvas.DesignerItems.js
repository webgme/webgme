"use strict";

define(['js/DiagramDesigner/DesignerItem',
        'js/DiagramDesigner/DefaultDecorator'   /*load the default decorator just to make sure it's here for sure*/
        ], function (DesignerItem,
                                                          DefaultDecorator) {

    var DesignerCanvas,
        DEFAULT_DECORATOR_NAME = "DefaultDecorator",
        DEFAULT_DECORATOR_CLASS = DefaultDecorator;

    DesignerCanvas = function () {

    };

    DesignerCanvas.prototype.createDesignerItem = function (objDescriptor) {
        var componentId = objDescriptor.id,
            newComponent,
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y),
            self = this;

        this.logger.debug("Creating model component with id: '" + objDescriptor.id + "'");

        objDescriptor.designerCanvas = this;
        objDescriptor.position.x = alignedPosition.x;
        objDescriptor.position.y = alignedPosition.y;

        //make sure it has a specified decorator
        objDescriptor.decorator = objDescriptor.decorator || DEFAULT_DECORATOR_NAME;
        objDescriptor.DecoratorClass = objDescriptor.DecoratorClass || DEFAULT_DECORATOR_CLASS;

        this._checkPositionOverlap(objDescriptor);

        this.itemIds.push(componentId);

        //add to accounting queues for performance optimization
        this._insertedDesignerItemIDs.push(componentId);

        newComponent = this.items[componentId] = new DesignerItem(objDescriptor.id);
        newComponent._initialize(objDescriptor);
        newComponent.addToDocFragment(this._documentFragment);

        return newComponent;
    };

    DesignerCanvas.prototype.updateDesignerItem  = function (componentId, objDescriptor) {
        var alignedPosition;

        if (this.itemIds.indexOf(componentId) !== -1) {
            this.logger.debug("Updating model component with parameters: " + objDescriptor);

            //adjust its position to this canvas
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

            objDescriptor.position.x = alignedPosition.x;
            objDescriptor.position.y = alignedPosition.y;

            //make sure it has a specified decorator
            objDescriptor.decorator = objDescriptor.decorator || DEFAULT_DECORATOR_NAME;

            this._checkPositionOverlap(objDescriptor);

            //add to accounting queues for performance optimization
            this._updatedDesignerItemIDs.push(componentId);

            this.items[componentId].update(objDescriptor);
        }
    };

    DesignerCanvas.prototype.deleteDesignerItem  = function (id) {
        var idx;

        //keep up accounting
        this._deletedDesignerItemIDs.push(id);

        idx = this.itemIds.indexOf(id);
        this.itemIds.splice(idx, 1);

        this.items[id].destroy();
        delete this.items[id];
    };

    return DesignerCanvas;
});
