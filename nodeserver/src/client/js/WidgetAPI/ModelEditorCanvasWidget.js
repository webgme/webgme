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
            refresh,
            onComponentMouseDown,
            setSelection,
            clearSelection,
            selectedComponentIds = [],
            onBackgroundMouseDown,
            onBackgroundMouseUp,
            dragStartPos = { "x": 0, "y": 0},
            selectionBBox = { "x": 0, "y": 0, "x2": 0, "y2": 0 };

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
            self.skinParts.childrenContainer.bind('mousedown', onBackgroundMouseDown);

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

            //hook up selection
            childComponentEl.bind('mousedown', onComponentMouseDown);

            //hook up moving
            //enable dragging
            childComponentEl.css("cursor", "move");
            childComponentEl.disableSelection();

            childComponentEl.draggable({
                zIndex: 100000,
                grid: [myGridSize, myGridSize],
                helper: function (event) {
                    var clonedInstance = childComponentEl.clone().attr("id", childComponent.getId() + "_clone").css("opacity", "0.000001");

                    dragStartPos.x = parseInt(childComponentEl.css("left"), 10);
                    dragStartPos.y = parseInt(childComponentEl.css("top"), 10);

                    return clonedInstance;
                },
                start: function (event, ui) {
                    var i,
                        childId;

                    for (i = 0; i < selectedComponentIds.length; i += 1) {
                        childId = selectedComponentIds[i];
                        self.children[childId].dragStartPos = {"x": parseInt(self.children[childId].el.css("left"), 10), "y": parseInt(self.children[childId].el.css("top"), 10) };
                        if (i === 0) {
                            selectionBBox.x = self.children[childId].dragStartPos.x;
                            selectionBBox.y = self.children[childId].dragStartPos.y;
                            selectionBBox.x2 = selectionBBox.x + self.children[childId].el.outerWidth();
                            selectionBBox.y2 = selectionBBox.y + self.children[childId].el.outerHeight();
                        } else {
                            if (selectionBBox.x > self.children[childId].dragStartPos.x) {
                                selectionBBox.x = self.children[childId].dragStartPos.x;
                            }
                            if (selectionBBox.y > self.children[childId].dragStartPos.y) {
                                selectionBBox.y = self.children[childId].dragStartPos.y;
                            }
                            if (selectionBBox.x2 < self.children[childId].dragStartPos.x + self.children[childId].el.outerWidth()) {
                                selectionBBox.x2 = self.children[childId].dragStartPos.x + self.children[childId].el.outerWidth();
                            }
                            if (selectionBBox.y2 < self.children[childId].dragStartPos.y + self.children[childId].el.outerHeight()) {
                                selectionBBox.y2 = self.children[childId].dragStartPos.y + self.children[childId].el.outerHeight();
                            }
                        }
                    }

                    selectionBBox.w = selectionBBox.x2 - selectionBBox.x;
                    selectionBBox.h = selectionBBox.y2 - selectionBBox.y;

                    childDragValidPos = true;
                    self.skinParts.dragPosPanel.removeClass("invalidPosition");
                    self.skinParts.dragPosPanel.html("X: " + selectionBBox.x + " Y: " + selectionBBox.y);
                    self.skinParts.dragPosPanel.css("left", selectionBBox.x + (selectionBBox.w - self.skinParts.dragPosPanel.outerWidth()) / 2);
                    self.skinParts.dragPosPanel.css("top", selectionBBox.y + selectionBBox.h + 10);
                    self.skinParts.dragPosPanel.show();
                    logger.debug("Start dragging from original position X: " + childComponent.dragStartPos.x + ", Y: " + childComponent.dragStartPos.y);
                },
                stop: function (event, ui) {
                    var stopPos = { "x": parseInt(ui.helper.css("left"), 10), "y": parseInt(ui.helper.css("top"), 10) },
                        dX = stopPos.x - dragStartPos.x,
                        dY = stopPos.y - dragStartPos.y,
                        i,
                        childId,
                        rollBackFn;

                    logger.debug("Stop dragging at position X: " + stopPos.x + ", Y: " + stopPos.y);
                    self.skinParts.dragPosPanel.hide();

                    if (childDragValidPos === true) {
                        //save back new position
                        //TODO: FIXME - do all the save in one round!!!!
                        for (i = 0; i < selectedComponentIds.length; i += 1) {
                            childId = selectedComponentIds[i];
                            self.children[childId].setPosition(self.children[childId].dragStartPos.x + dX, self.children[childId].dragStartPos.y + dY, false);
                        }
                    } else {
                        //roll back to original position
                        logger.debug("Component has been dropped at an invalid position, rolling back to original. X: " +  childComponent.dragStartPos.x + ", Y: " + childComponent.dragStartPos.y);
                        rollBackFn = function (child) {
                            child.el.animate({
                                left: child.dragStartPos.x,
                                top: child.dragStartPos.y
                            }, 200, function () {
                                delete child.dragStartPos;
                            });
                        };
                        for (i = 0; i < selectedComponentIds.length; i += 1) {
                            childId = selectedComponentIds[i];
                            rollBackFn(self.children[childId]);
                        }
                    }
                },
                drag: function (event, ui) {
                    var dragPos = { "x": parseInt(ui.helper.css("left"), 10), "y": parseInt(ui.helper.css("top"), 10) },
                        validPos = true,
                        childBBox,
                        dX = dragPos.x - dragStartPos.x,
                        dY = dragPos.y - dragStartPos.y,
                        i,
                        childId;

                    //position panel
                    self.skinParts.dragPosPanel.html("X: " + dragPos.x + " Y: " + dragPos.y);
                    childBBox = childComponent.getBoundingBox();
                    self.skinParts.dragPosPanel.css("left", childBBox.x + (childBBox.w - self.skinParts.dragPosPanel.outerWidth()) / 2);
                    self.skinParts.dragPosPanel.css("top", childBBox.y + childBBox.h + 10 + (selectedComponentIds.length > 1 ? -30 : 0));

                    self.skinParts.dragPosPanel.html("X: " + (selectionBBox.x + dX) + " Y: " + (selectionBBox.y + dY));
                    self.skinParts.dragPosPanel.css("left", selectionBBox.x + dX + (selectionBBox.w - self.skinParts.dragPosPanel.outerWidth()) / 2);
                    self.skinParts.dragPosPanel.css("top", selectionBBox.y + dY + selectionBBox.h + 10);

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

                    //move all the selected children
                    for (i = 0; i < selectedComponentIds.length; i += 1) {
                        childId = selectedComponentIds[i];
                        self.children[childId].el.css("left", self.children[childId].dragStartPos.x + dX);
                        self.children[childId].el.css("top", self.children[childId].dragStartPos.y + dY);
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

        onComponentMouseDown = function (e) {
            var id = $(e.currentTarget).attr('id');

            setSelection([id], e.ctrlKey);
        };

        setSelection = function (ids, ctrlPressed) {
            var i,
                childId,
                childComponent;

            if (ctrlPressed === true) {
                //while CTRL key is pressed, add/remove ids to the selection
                for (i = 0; i < ids.length; i += 1) {
                    childId = ids[i];
                    childComponent = self.children[childId];

                    if (selectedComponentIds.indexOf(childId) === -1) {
                        selectedComponentIds.push(childId);

                        childComponent.el.addClass("selectedModel");

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect.call(childComponent);
                        }
                    } else {
                        //child is already part of the selection
                        childComponent.el.removeClass("selectedModel");

                        if ($.isFunction(childComponent.onDeselect)) {
                            childComponent.onDeselect.call(childComponent);
                        }
                        //remove from selection and deselect it
                        selectedComponentIds.splice(selectedComponentIds.indexOf(childId), 1);

                    }
                }
            } else {
                //CTRL key is not pressed
                if (ids.length > 1) {
                    clearSelection();

                    for (i = 0; i < ids.length; i += 1) {
                        childId = ids[i];
                        childComponent = self.children[childId];

                        selectedComponentIds.push(childId);

                        childComponent.el.addClass("selectedModel");

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect.call(childComponent);
                        }
                    }
                } else {
                    childId = ids[0];
                    childComponent = self.children[childId];

                    //if not yet in selection
                    if (selectedComponentIds.indexOf(childId) === -1) {
                        clearSelection();

                        selectedComponentIds.push(childId);

                        childComponent.el.addClass("selectedModel");

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect.call(childComponent);
                        }
                    }
                }
            }

            logger.debug("selectedids: " + selectedComponentIds);
        };

        clearSelection = function () {
            var i,
                childId,
                childComponent;

            for (i = 0; i < selectedComponentIds.length; i += 1) {
                childId = selectedComponentIds[i];
                childComponent = self.children[childId];

                if (childComponent) {
                    childComponent.el.removeClass("selectedModel");

                    if ($.isFunction(childComponent.onDeselect)) {
                        childComponent.onDeselect.call(childComponent);
                    }

                }
            }

            selectedComponentIds = [];
        };

        onBackgroundMouseDown = function (e) {
            var target = e.target || e.currentTarget;
            if (target === self.skinParts.childrenContainer[0]) {
                if (e.ctrlKey !== true) {
                    clearSelection();
                }
            }
        };
    };

    return ModelEditorCanvasWidget;
});