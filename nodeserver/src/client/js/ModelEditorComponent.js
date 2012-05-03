"use strict";
/*
 * WIDGET ModelEditorComponent
 */
define([ './util.js', './../../common/LogManager.js', './../../common/CommonUtil.js' ], function (util, logManager, commonUtil) {
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    //util.loadCSS( 'css/ModelEditorSVGWidget.css' );

    var ModelEditorComponent = function (nodeDescriptor, widget, skinInstance) {
        var logger,
            guid,
            render,
            posX,
            posY,
            componentDiv,
            self = this,
            parentComponent = null,
            containerElement = null,
            childContainerElement = null,
            childrenComponents = [],
            childrenComponentIndices = {},
            originalPos = null,
            isExpanded = false;

        //generate unique id for control
        guid = nodeDescriptor.id;

        //get logger instance for this component
        logger = logManager.create("ModelEditorComponent_" + guid);

        //read properties from node
        posX = nodeDescriptor.positionX || 0;
        posY = nodeDescriptor.positionY || 0;

        componentDiv = $("<div/>", {
            "id": "component_" + guid,
            "class" : "modelEditorComponent"
        });
        componentDiv.css("position", "absolute");

        render = function () {
            var i = 0;

            if ($.isFunction(skinInstance.onRender)) {
                skinInstance.onRender(nodeDescriptor);
            }

            if (childrenComponents.length > 0 && childContainerElement !== null) {
                for (i = 0; i < childrenComponents.length; i += 1) {
                    childrenComponents[i].render();
                }
            }
        };

        this.getId = function () {
            return guid;
        };

        this.getSkinInstance = function () {
            return skinInstance;
        };

        this.getPosition = function () {
            return { "x": posX, "y": posY };
        };

        this.getBoundingBox = function () {
            var bBox = {"x" : posX, "y": posY, "w": componentDiv.outerWidth(), "h": componentDiv.outerHeight() };
            bBox.x2 = bBox.x + bBox.w;
            bBox.y2 = bBox.y + bBox.h;
            return bBox;
        };

        this.setPosition = function (newPosition) {
            if ((typeof newPosition.x === "number") && (typeof newPosition.y === "number")) {
                /*if (parentComponent) {
                    if ($.isFunction(parentComponent.getSkinInstance().onChildSetPosition)) {
                        parentComponent.getSkinInstance().onChildSetPosition(guid, newPosition);
                    }
                }*/
                posX = newPosition.x;
                posY = newPosition.y;

                componentDiv.css("left", posX);
                componentDiv.css("top", posY);
            }
        };

        this.getComponentContainer = function () {
            return componentDiv;
        };

        this.setChildrenContainerElement = function (cContainer) {
            childContainerElement = cContainer;
        };

        this.setParentComponent = function (parent) {
            parentComponent = parent;
        };

        this.updateProperties = function (newNodeDescriptor) {
            var positionChanged = false,
                newPosX,
                newPosY,
                i;

            //check properties handled by the component itself
            if (newNodeDescriptor.positionX) {
                if (posX !== newNodeDescriptor.positionX) {
                    newPosX = newNodeDescriptor.positionX;
                    positionChanged = true;
                }
            }

            if (newNodeDescriptor.positionY) {
                if (posY !== newNodeDescriptor.positionY) {
                    newPosY = newNodeDescriptor.positionY;
                    positionChanged = true;
                }
            }

            if (positionChanged === true) {
                self.setPosition({ "x": newPosX, "y": newPosY });
            }

            //copy over properties from new nodeDescriptor to the old one
            for (i in newNodeDescriptor) {
                if (newNodeDescriptor.hasOwnProperty(i)) {
                    nodeDescriptor[i] = newNodeDescriptor[i];
                }
            }

            render();
        };

        this.addTo = function (cElement) {
            if (containerElement !== cElement) {
                if (containerElement) {
                    componentDiv.remove();
                }

                containerElement = cElement;
                componentDiv.appendTo(containerElement);
                if ($.isFunction(skinInstance.onAddTo)) {
                    skinInstance.onAddTo(componentDiv);
                }
                componentDiv.css("z-index", containerElement.css("z-index"));

                componentDiv.css("left", posX);
                componentDiv.css("top", posY);

                render();
            }
        };

        this.getWidget = function () {
            return widget;
        }

        this.getChildren = function () {
            return childrenComponents;
        };

        this.addChild = function (child) {
            var childComponentContainer = null;
            if (!childrenComponentIndices.hasOwnProperty(child.getId())) {
                childrenComponentIndices[child.getId()] = childrenComponents.push(child) - 1;
                child.setParentComponent(self);
                if (childContainerElement !== null) {
                    if ($.isFunction(skinInstance.onAddChild)) {
                        skinInstance.onAddChild(child);
                    }
                    child.addTo(childContainerElement);

                    if (skinInstance.childrenDraggable() === true) {
                        childComponentContainer = child.getComponentContainer();

                        if (childComponentContainer) {
                            //enable dragging
                            childComponentContainer.css("cursor", "move");
                            childComponentContainer.addClass("noUserSelect");

                            childComponentContainer.draggable({
                                zIndex: 100000,
                                grid: [10, 10],
                                start: function (event, ui) {
                                    child.dragStartPos = child.getPosition();
                                    logger.debug("Start dragging '" + child.getId() + "' from original position X: " + child.dragStartPos.x + ", Y: " + child.dragStartPos.y);
                                    if ($.isFunction(skinInstance.onChildDragStart)) {
                                        skinInstance.onChildDragStart(child);
                                    }

                                    if ($.isFunction(child.getSkinInstance().onDragStart)) {
                                        child.getSkinInstance().onDragStart();
                                    }
                                },
                                stop: function (event, ui) {
                                    var stopPos = child.getPosition(),
                                        validPos = true;
                                    logger.debug("Stop dragging '" + child.getId() + "' at position X: " + stopPos.x + ", Y: " + stopPos.y);
                                    if ($.isFunction(skinInstance.onChildDragStop)) {
                                        validPos = skinInstance.onChildDragStop(child);
                                    }
                                    if ($.isFunction(child.getSkinInstance().onDragStop)) {
                                        child.getSkinInstance().onDragStop();
                                    }
                                    if (validPos === true) {
                                        //save back new position
                                        if ($.isFunction(widget.onObjectPositionChanged)) {
                                            widget.onObjectPositionChanged.call(widget, child.getId(), child.getPosition());
                                        }
                                    } else {
                                        //roll back to original position
                                        logger.debug("Component has been dropped at an invalid position, rolling back to original. X: " +  child.dragStartPos.x + ", Y: " + child.dragStartPos.y);
                                        child.getComponentContainer().animate({
                                            left: child.dragStartPos.x,
                                            top: child.dragStartPos.y
                                        }, 500, function () {
                                            child.setPosition({ "x": child.dragStartPos.x, "y": child.dragStartPos.y });
                                            delete child.dragStartPos;
                                        });

                                    }
                                },
                                drag: function (event, ui) {
                                    var validPos = true;
                                    child.setPosition({"x": childComponentContainer.position().left, "y": childComponentContainer.position().top });
                                    if ($.isFunction(skinInstance.onChildDrag)) {
                                        validPos = skinInstance.onChildDrag(child);
                                    }
                                    if ($.isFunction(child.getSkinInstance().onDrag)) {
                                        child.getSkinInstance().onDrag(validPos);
                                    }
                                }
                            });
                        }
                    }
                }
            }
        };

        //hook up the component to the skinInstance
        skinInstance.attachToComponent(self);
    };

    return ModelEditorComponent;
});