"use strict";

define(['./../../../common/LogManager.js',
        './../../../common/EventDispatcher.js',
        './../util.js',
        './WidgetBase.js',
        './ModelEditorModelWidget.js',
        './ModelEditorConnectionWidget.js',
        './../NotificationManager.js'], function (logManager,
                                                      EventDispatcher,
                                                      util,
                                                      WidgetBase,
                                                      ModelEditorModelWidget,
                                                      ModelEditorConnectionWidget,
                                                      notificationManager) {

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorCanvasWidget.css');

    var ModelEditorCanvasWidget = function (id) {
        var logger,
            self = this,
            territoryId = 0,
            currentNodeInfo = { "id": id, "children" : [] },
            defaultSize = { "w": 800, "h": 1000 },
            skinContent = {},
            createChildComponent,
            childComponentsCreateQueue = {},
            myGridSize = 10,
            childDragValidPos = true,
            onChildDrag,
            positionChildOnCanvas,
            adjustChildrenContainerSize,
            refresh;

        $.extend(this, new WidgetBase(id));

        //disable any kind of selection on the control because of dragging
        this.el.disableSelection();

        //get logger instance for this component
        logger = logManager.create("ModelEditorCanvasWidget_" + id);
        logManager.setLogLevel(5);

        this.initializeFromNode = function (node) {
            var newPattern;

            territoryId = self.project.reserveTerritory(self);
            currentNodeInfo.children = node.getAttribute(self.nodeAttrNames.children);

            //generate skin controls
            //node title
            self.skinParts.title = $('<div/>');
            self.skinParts.title.addClass("modelEditorCanvasTitle");
            this.el.append(self.skinParts.title);

            //children container
            self.skinParts.childrenContainer = $('<div/>', {
                "class" : "children"
            });
            //by default occupy all the available space
            self.skinParts.childrenContainer.outerWidth(defaultSize.w).outerHeight(defaultSize.h);
            this.el.append(self.skinParts.childrenContainer);

            this.skinParts.dragPosPanel = $('<div/>', {
                "class" : "dragPosPanel"
            });
            this.el.append(self.skinParts.dragPosPanel);

            //get content from node
            skinContent.title = node.getAttribute(self.nodeAttrNames.name);

            //apply content to controls
            self.skinParts.title.html(skinContent.title);

            //specify territory
            newPattern = {};
            newPattern[self.getId()] = { "children": 0 };
            self.project.addPatterns(territoryId, newPattern);
        };

        this.addedToParent = function () {
            var i;
            //create widget for children and add them to self

            for (i = 0; i < currentNodeInfo.children.length; i += 1) {
                createChildComponent(currentNodeInfo.children[i], true);
            }
        };

        createChildComponent = function (childId, silent) {
            var childNode = self.project.getNode(childId),
                childWidget;

            if (silent === false) {
                childComponentsCreateQueue[childId] = childId;
            }

            childWidget = new ModelEditorModelWidget(childId);
            childWidget.project = self.project;
            childWidget.initializeFromNode(childNode);
            self.addChild(childWidget);
        };

        this.childBBoxChanged = function (child) {
            //check children's X;Y position based on this parent's layout settings
            positionChildOnCanvas(child);

            //check if the new children does not cause overlap
            //readjust if necessary

            //check if current children container's width and height are big enough to contain the children
            adjustChildrenContainerSize(child);
        };

        positionChildOnCanvas = function (childComponent) {
            var posXDelta,
                posYDelta,
                childComponentEl = $(childComponent.el),
                pX = parseInt(childComponentEl.css("left"), 10),
                pY = parseInt(childComponentEl.css("top"), 10);

            //correct the children position based on this skin's granularity
            posXDelta = pX % myGridSize;
            posYDelta = pY % myGridSize;

            pX += (posXDelta < Math.floor(myGridSize / 2) + 1 ? -1 * posXDelta : myGridSize - posXDelta);
            pY += (posYDelta < Math.floor(myGridSize / 2) + 1 ? -1 * posYDelta : myGridSize - posYDelta);

            if ((parseInt(childComponentEl.css("left"), 10) !== pX) || (parseInt(childComponentEl.css("top"), 10) !== pY)) {
                childComponent.setPosition(pX, pY, true);
            }
        };

        adjustChildrenContainerSize = function (childComponent) {
            var cW = self.skinParts.childrenContainer.outerWidth(),
                cH = self.skinParts.childrenContainer.outerHeight(),
                childBBox = childComponent.getBoundingBox();

            if (cW < childBBox.x2) {
                self.skinParts.childrenContainer.outerWidth(childBBox.x2 + 100);
            }
            if (cH < childBBox.y2) {
                self.skinParts.childrenContainer.outerHeight(childBBox.y2 + 100);
            }
        };

        this.childAdded = function (childComponent) {
            var childComponentEl = $(childComponent.el);

            //hook up moving
            //enable dragging
            childComponentEl.css("cursor", "move");
            childComponentEl.disableSelection();

            childComponentEl.draggable({
                zIndex: 100000,
                grid: [myGridSize, myGridSize],
                start: function (event, ui) {
                    childComponent.dragStartPos = {"x": parseInt(childComponentEl.css("left"), 10), "y": parseInt(childComponentEl.css("top"), 10) };
                    childDragValidPos = true;
                    self.skinParts.dragPosPanel.removeClass("invalidPosition");
                    self.skinParts.dragPosPanel.show();
                    logger.debug("Start dragging from original position X: " + childComponent.dragStartPos.x + ", Y: " + childComponent.dragStartPos.y);
                },
                stop: function (event, ui) {
                    var stopPos = { "x": parseInt(childComponentEl.css("left"), 10), "y":  parseInt(childComponentEl.css("top"), 10) };
                    logger.debug("Stop dragging at position X: " + stopPos.x + ", Y: " + stopPos.y);
                    self.skinParts.dragPosPanel.hide();
                    self.el.removeClass("invalidChildDrag");
                    if (childDragValidPos === true) {
                        //save back new position
                        childComponent.setPosition(stopPos.x, stopPos.y, false);
                    } else {
                        //roll back to original position
                        logger.debug("Component has been dropped at an invalid position, rolling back to original. X: " +  childComponent.dragStartPos.x + ", Y: " + childComponent.dragStartPos.y);
                        childComponentEl.animate({
                            left: childComponent.dragStartPos.x,
                            top: childComponent.dragStartPos.y
                        }, 200, function () {
                            delete childComponent.dragStartPos;
                        });
                    }
                },
                drag: function (event, ui) {
                    var dragPos = { "x": parseInt(childComponentEl.css("left"), 10), "y": parseInt(childComponentEl.css("top"), 10) },
                        validPos = true,
                        childBBox;

                    //position panel
                    self.skinParts.dragPosPanel.html("X: " + dragPos.x + " Y: " + dragPos.y);
                    childBBox = childComponent.getBoundingBox();
                    self.skinParts.dragPosPanel.css("left", childBBox.x + (childBBox.w - self.skinParts.dragPosPanel.outerWidth()) / 2);
                    self.skinParts.dragPosPanel.css("top", childBBox.y + childBBox.h + 10);

                    if ($.isFunction(onChildDrag)) {
                        validPos = onChildDrag.call(self, childComponent);
                    }

                    if (childDragValidPos !== validPos) {
                        childDragValidPos = validPos;
                        if (childDragValidPos === false) {
                            self.skinParts.dragPosPanel.addClass("invalidPosition");
                        } else {
                            self.skinParts.dragPosPanel.removeClass("invalidPosition");
                        }
                    }
                }
            });
        };

        onChildDrag = function (childComponent) {
            var validPos = true,
                i,
                childBBox = childComponent.getBoundingBox();

            if (childBBox.x < 0 || childBBox.y < 0) {
                validPos = false;
            }

            if (validPos === true) {
                for (i in self.children) {
                    if (self.children.hasOwnProperty(i)) {
                        if (childComponent.el !== self.children[i].el) {
                            validPos = !(util.overlap(childBBox, self.children[i].getBoundingBox()));
                            if (validPos === false) {
                                break;
                            }
                        }
                    }
                }
            }

            return validPos;
        };

        // PUBLIC METHODS
        this.onEvent = function (etype, eid) {
            if (eid === currentNodeInfo.id) {
                switch (etype) {
                case "load":
                    //refresh("insert", eid);
                    break;
                case "modify":
                    refresh("update", eid);
                    break;
                case "create":
                    //refresh("insert", eid);
                    break;
                case "delete":
                    //refresh("update", eid);
                    break;
                }
            }
        };

        refresh = function (eventType, nodeId) {
            var node = self.project.getNode(nodeId),
                newTitle,
                newChildren = [],
                childrenDiff = [],
                i;

            if (node) {
                if (eventType === "update") {

                    //update of currently opened node
                    //- title might have changed
                    //- children collection might have changed

                    newTitle = node.getAttribute(self.nodeAttrNames.name);
                    if (skinContent.title !== newTitle) {
                        self.skinParts.title.html(newTitle).hide().fadeIn('fast');
                        notificationManager.displayMessage("Object title '" + skinContent.title + "' has been changed to '" + newTitle + "'.");
                        skinContent.title = newTitle;
                    }

                    newChildren = node.getAttribute(self.nodeAttrNames.children);

                    //added children handled in the 'insert' part
                    //but keep track of them here because of the notifications
                    childrenDiff = util.arrayMinus(newChildren, currentNodeInfo.children);
                    for (i = 0; i < childrenDiff.length; i += 1) {
                        createChildComponent(childrenDiff[i], true);
                    }
                    if (childrenDiff.length > 0) {
                        if (childrenDiff.length > 1) {
                            notificationManager.displayMessage(childrenDiff.length + " new children have been created for '" + skinContent.title + "'");
                        } else {
                            notificationManager.displayMessage("1 new child has been created for '" + skinContent.title + "'");
                        }
                    }

                    //handle removed children
                    childrenDiff = util.arrayMinus(currentNodeInfo.children, newChildren);
                    for (i = 0; i < childrenDiff.length; i += 1) {
                        //remove the children
                        self.removeChildById(childrenDiff[i]);
                    }
                    if (childrenDiff.length > 0) {
                        if (childrenDiff.length > 1) {
                            notificationManager.displayMessage(childrenDiff.length + " children have been removed from '" + skinContent.title + "'");
                        } else {
                            notificationManager.displayMessage("1 child has been removed from '" + skinContent.title + "'");
                        }
                    }

                    //save new children collection info
                    currentNodeInfo.children = newChildren;
                }
            }
        };

        this.destroy = function () {
            var i;

            //destroy all children
            for (i in self.children) {
                if (self.children.hasOwnProperty(i)) {
                    self.children[i].destroy();
                }
            }

            //delete its own territory
            self.project.removeTerritory(territoryId);

            //finally remove itself from DOM
            this.el.remove();
        };
    };

    return ModelEditorCanvasWidget;
});