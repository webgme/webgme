"use strict";

define(['./../../common/LogManager.js', './../../common/EventDispatcher.js', './util.js'], function (logManager, EventDispatcher, util) {

    var ModelEditorCanvasSkin = function () {
        var logger,
            skinPropertyDescriptor,
            skinParts = {},
            myComponent = null,
            myGridSpace = 10,
            isChildPositionValid;

        //specify skinPropertyDescriptor
        skinPropertyDescriptor = { "id": "_id",
                                   "title": "name" };

        this.getSkinPropertyDescriptor = function () {
            return skinPropertyDescriptor;
        };

        this.childrenDraggable = function () {
            return true;
        };

        this.attachToComponent = function (hostComponent) {
            myComponent = hostComponent;
            //get logger instance for this component
            logger = logManager.create("ModelEditorCanvasSkin_" + myComponent.getId());
        };

        this.onAddTo = function (containerElement) {
            skinParts.title = $("<div/>", {
                "class" : "canvasTitle"
            });

            skinParts.childrenContainer = $("<div/>", {
                "class" : "childrenContainer"
            });

            myComponent.setChildrenContainerElement(skinParts.childrenContainer);

            containerElement.append(skinParts.title).append(skinParts.childrenContainer);
        };

        this.onRender = function (componentDescriptor) {
            skinParts.title.html(componentDescriptor.title);
        };

        this.onAddChild = function (childComponent) {
            var posXDelta,
                posYDelta,
                childPosition = childComponent.getPosition();

            //correct the children position based on this skin's granularity
            posXDelta = childPosition.x % myGridSpace;
            posYDelta = childPosition.y % myGridSpace;

            childPosition.x += (posXDelta < Math.floor(myGridSpace / 2) + 1 ? -1 * posXDelta : myGridSpace - posXDelta);
            childPosition.y += (posYDelta < Math.floor(myGridSpace / 2) + 1 ? -1 * posYDelta : myGridSpace - posYDelta);

            childComponent.setPosition(childPosition);
        };

        this.onChildDragStart = function (child) {
            child.getComponentContainer().css("opacity", "0.5");
        };

        this.onChildDragStop = function (child) {
            child.getComponentContainer().css("opacity", "1.0");
            return isChildPositionValid(child);
        };

        this.onChildDrag = function (child) {
            return isChildPositionValid(child);
        };

        this.onChildSetPosition = function (childId, position) {
            position.x += 100;
            position.y += 100;
        };

        isChildPositionValid = function (child) {
            var validPos = true,
                i = 0,
                boundingBoxDraggedChild = child.getBoundingBox(),
                boundingBoxOther = null,
                otherChildren = [];

            //test for parent boundaries
            if ((boundingBoxDraggedChild.x < 0) || (boundingBoxDraggedChild.y < 0)) {
                validPos = false;
            }

            if (validPos === true) {
                //iterate through all the children and check overlap
                otherChildren = myComponent.getChildren();
                for (i = 0; i < otherChildren.length; i += 1) {
                    if (otherChildren[i].getId() !== child.getId()) {
                        boundingBoxOther = otherChildren[i].getBoundingBox();
                        if (util.overlap(boundingBoxDraggedChild, boundingBoxOther) === true) {
                            validPos = false;
                            break;
                        }
                    }
                }
            }

            return validPos;
        };
    };

    return ModelEditorCanvasSkin;
});