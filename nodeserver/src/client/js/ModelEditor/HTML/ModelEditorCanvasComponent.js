"use strict";

define(['logManager',
        'clientUtil',
        'commonUtil',
        'raphaeljs',
        'nodeAttributeNames',
        'nodeRegistryNames',
        './ComponentBase.js',
        './ModelEditorModelComponent.js',
        './ModelEditorConnectionComponent.js',
        'css!ModelEditorHTMLCSS/ModelEditorCanvasComponent'
        ], function (logManager,
                     util,
                     commonUtil,
                     raphaeljs,
                     nodeAttributeNames,
                     nodeRegistryNames,
                     ComponentBase,
                     ModelEditorModelComponent,
                     ModelEditorConnectionComponent) {

    var ModelEditorCanvasComponent,
        baseIdNames = { "connection": "connection" };

    ModelEditorCanvasComponent = function (id, proj) {
        $.extend(this, new ComponentBase(id, proj));

        this.logger = logManager.create("ModelEditorCanvasComponent_" + id);
        this.logger.debug("Created");

        this.defaultSize = { "w": 2000, "h": 1000 };

        this.territoryId = this.project.addUI(this);
        this.selfPatterns = {};

        this.childrenIds = [];
        this.connectionList = {};

        this.gridSize = 10;

        this.selectedComponentIds = [];

        this.dragOptions = {};
        this.dragModes = {"copy": 0,
                                "reposition": 1};

        this.selectionRubberBand = {};

        this.displayedComponentIDs = {};

        //helper object for on-the-fly drawing connection between two elements
        this.connectionInDraw = {};

        /*
         * OVERRIDE COMPONENTBASE MEMBERS
         */
        this.addedToParent = function () {
            this._addedToParent();
        };

        this.onDestroy = function () {
            this.project.updateTerritory(this.territoryId, []);

            this.logger.debug("onDestroy");
        };
        /*
         * END OVERRIDE COMPONENTBASE MEMBERS
         */

        this._initialize();
    };

    ModelEditorCanvasComponent.prototype._initialize = function () {
        var node = this.project.getNode(this.getId()),
            self = this;

        //generate skin controls
        this.el.addClass("modelEditorCanvas");
        //node title
        this.skinParts.title = $('<div/>');
        this.skinParts.title.addClass("modelEditorCanvasTitle");
        this.el.append(this.skinParts.title);

        //children container
        this.skinParts.childrenContainer = $('<div/>', {
            "class" : "children",
            "id" : this.getId() + "_children"//,
            //"tabindex": 0
        });
        this.skinParts.childrenContainer.css("position", "absolute");
        this.skinParts.childrenContainer.outerWidth(this.defaultSize.w).outerHeight(this.defaultSize.h);
        this.el.append(this.skinParts.childrenContainer);

        //hook up mousedown on background
        this.skinParts.childrenContainer.bind('mousedown', function (event) {
            self._onBackgroundMouseDown.call(self, event);
        });
        this.skinParts.childrenContainer.bind('mousemove', function (event) {
            self._onBackgroundMouseMove.call(self, event);
        });
        this.skinParts.childrenContainer.bind('mouseup', function (event) {
            self._onBackgroundMouseUp.call(self, event);
        });

        this.skinParts.dragPosPanel = $('<div/>', {
            "class" : "dragPosPanel"
        });
        this.skinParts.childrenContainer.append(this.skinParts.dragPosPanel);

        this.skinParts.rubberBand = $('<div/>', {
            "class" : "rubberBand"
        });
        this.skinParts.childrenContainer.append(this.skinParts.rubberBand);
        this.skinParts.rubberBand.hide();

        //apply content to controls
        this.skinParts.title.text(node.getAttribute(nodeAttributeNames.name));

        //specify territory
        this.selfPatterns[this.getId()] = { "children": 1};
        this.project.updateTerritory(this.territoryId, this.selfPatterns);
    };

    ModelEditorCanvasComponent.prototype._addedToParent = function () {
        var i,
            node = this.project.getNode(this.getId()),
            self = this;

        //initialize Raphael paper from children container and set it to be full size of the HTML container
        this.skinParts.svgPaper = Raphael(this.skinParts.childrenContainer.attr("id"));
        this.skinParts.svgPaper.canvas.style.pointerEvents = "none";
        this.skinParts.svgPaper.setSize("100%", "100%");

        //create connection line instance
        this.connectionInDraw.path = this.skinParts.svgPaper.path("M0,0").attr({"stroke-width": 2,
            "stroke": "#FF7800", "stroke-dasharray": "-"}).hide();

        //create connection line instance
        this.connectionInDraw.path = this.skinParts.svgPaper.path("M0,0").attr(
            {   "stroke-width": 2,
                "stroke": "#FF7800",
                "stroke-dasharray": "-"}
        ).hide();

        //create component for each model children
        this.childrenIds = node.getChildrenIds();

        for (i = 0; i < this.childrenIds.length; i += 1) {
            self._createChildComponent(this.childrenIds[i]);
        }
    };

    ModelEditorCanvasComponent.prototype.childBBoxChanged = function (childComponentId) {
        var affectedConnectionEndPoints = [],
            subComponentId;

        //check children's X;Y position based on this parent's layout settings
        this._positionChildOnCanvas(childComponentId);

        //redraw affected connections
        affectedConnectionEndPoints.push(childComponentId);
        for (subComponentId in this.displayedComponentIDs) {
            if (this.displayedComponentIDs.hasOwnProperty(subComponentId)) {
                if (this.displayedComponentIDs[subComponentId] === childComponentId) {
                    affectedConnectionEndPoints.push(subComponentId);
                }
            }
        }
        this._updateConnectionsWithEndPoint(affectedConnectionEndPoints);

        //check if current children container's width and height are big enough to contain the children
        this._adjustChildrenContainerSize(childComponentId);
    };

    ModelEditorCanvasComponent.prototype._positionChildOnCanvas = function (childComponentId) {
        var childComponent = this.childComponents[childComponentId],
            childComponentEl = childComponent.el,
            pX = parseInt(childComponentEl.css("left"), 10),
            pY = parseInt(childComponentEl.css("top"), 10),
            posXDelta,
            posYDelta;

        //correct the children position based on this skin's granularity
        posXDelta = pX % this.gridSize;
        posYDelta = pY % this.gridSize;

        pX += (posXDelta < Math.floor(this.gridSize / 2) + 1 ? -1 * posXDelta : this.gridSize - posXDelta);
        pY += (posYDelta < Math.floor(this.gridSize / 2) + 1 ? -1 * posYDelta : this.gridSize - posYDelta);

        if ((posXDelta !== 0) || (posYDelta !== 0)) {
            childComponent.setPosition(pX, pY);
        }
    };

    ModelEditorCanvasComponent.prototype._adjustChildrenContainerSize = function (childComponentId) {
        var childComponent = this.childComponents[childComponentId],
            cW = this.skinParts.childrenContainer.outerWidth(),
            cH = this.skinParts.childrenContainer.outerHeight(),
            childBBox = childComponent.getBoundingBox();

        if (cW < childBBox.x2) {
            this.skinParts.childrenContainer.outerWidth(childBBox.x2 + 100);
        }
        if (cH < childBBox.y2) {
            this.skinParts.childrenContainer.outerHeight(childBBox.y2 + 100);
        }
    };

    ModelEditorCanvasComponent.prototype._createChildComponent = function (childId) {
        var childNode = this.project.getNode(childId),
            childComponent,
            self = this;

        if (this.childComponents.hasOwnProperty(childId) === false) {
            if (childNode) {
                if (childNode.getParentId() === this.getId()) {
                    if (childNode.getBaseId() === baseIdNames.connection) {
                        //if it is a CONNECTION, store its info in the connection list
                        //connections will be created when the end-objects appear on the canvas
                        this.connectionList[childId] = { "sourceId": childNode.getPointer("source").to,
                            "targetId": childNode.getPointer("target").to };

                        this._updateConnectionsWithEndPoint([this.connectionList[childId].sourceId]);
                    } else {
                        childComponent = new ModelEditorModelComponent(childId, this.project);
                        if (childComponent) {
                            this.addChild(childComponent);

                            //hook up mousedown
                            childComponent.el.bind('mousedown', function (event) {
                                self._onModelComponentMouseDown.call(self, event, childComponent);
                            });

                            //hook up dragging
                            childComponent.el.css("cursor", "move");
                            childComponent.el.draggable({
                                zIndex: 100000,
                                grid: [self.gridSize, self.gridSize],
                                helper: function (event) {
                                    return self._onDraggableHelper.call(self, event, childComponent);
                                },
                                start: function (event, ui) {
                                    return self._onDraggableStart.call(self, event, ui.helper, childComponent.getId());
                                },
                                stop: function (event, ui) {
                                    return self._onDraggableStop.call(self, event, ui.helper);
                                },
                                drag: function (event, ui) {
                                    return self._onDraggableDrag.call(self, event, ui.helper);
                                }
                            });

                            this.displayedComponentIDs[childId] = childId;
                        }
                    }
                }
            }
        }
    };

    ModelEditorCanvasComponent.prototype.onEvent = function (etype, eid) {
        this.logger.debug("onEvent '" + etype + "', '" + eid + "'");
        switch (etype) {
        case "load":
            this._createChildComponent(eid);
            break;
        case "update":
            this._update("update", eid);
            break;
        case "unload":
            if (eid === this.getId()) {
                this._unload();
            }
            break;
        }
    };

    /*
     * Called when the currently opened model has been deleted
     */
    ModelEditorCanvasComponent.prototype._unload = function () {
        this.skinParts.title.text("The previously edited model has been deleted...");
    };

    ModelEditorCanvasComponent.prototype._update = function (eventType, objectId) {
        var updatedObject = this.project.getNode(objectId),
            oldChildrenIds,
            updatedChildrenIds,
            diffChildrenIds,
            i;

        //check if the update is about the model being edited
        //or one of its children
        if (objectId === this.getId()) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            // - new children
            // - deleted children

            //handle name change
            this.skinParts.title.text(updatedObject.getAttribute(nodeAttributeNames.name));

            oldChildrenIds = this.childrenIds.splice(0);
            updatedChildrenIds = updatedObject.getChildrenIds() || [];

            //Handle children deletion
            diffChildrenIds = util.arrayMinus(oldChildrenIds, updatedChildrenIds);

            for (i = 0; i < diffChildrenIds.length; i += 1) {
                this.removeChildById(diffChildrenIds[i]);
                if (this.connectionList.hasOwnProperty(diffChildrenIds[i])) {
                    delete this.connectionList[diffChildrenIds[i]];
                }
            }

            //Handle children addition
            diffChildrenIds = util.arrayMinus(updatedChildrenIds, oldChildrenIds);
            for (i = 0; i < diffChildrenIds.length; i += 1) {
                this._createChildComponent(diffChildrenIds[i]);
            }

            //finally store the actual children info for the parent
            this.childrenIds = updatedChildrenIds;
        } else {
            //check if it is about any child component
            if (this.childComponents[objectId]) {
                this.childComponents[objectId].update.call(this.childComponents[objectId]);
            }
        }
    };

    ModelEditorCanvasComponent.prototype._onModelComponentMouseDown = function (event, component) {
        this.logger.debug("_onModelComponentMouseDown: " + component.getId());

        //mousedown initiates a component selection
        this._setSelection([component.getId()], event.ctrlKey);

        event.stopPropagation();
        event.preventDefault();
    };

    ModelEditorCanvasComponent.prototype._setSelection = function (idList, ctrlPressed) {
        var i,
            childComponent,
            childComponentId;

        this.logger.debug("_setSelection: " + idList + ", ctrlPressed: " + ctrlPressed);

        if (idList.length > 0) {
            if (ctrlPressed === true) {
                //check if the items in the current seelction can participate in multiselection
                //if not, clear current selection
                if (this.selectedComponentIds.length > 0) {
                    if (this.childComponents[this.selectedComponentIds[0]].isMultiSelectable() !== true) {
                        this._clearSelection();
                    }
                }

                //while CTRL key is pressed, add/remove ids to the selection
                for (i = 0; i < idList.length; i += 1) {
                    childComponentId = idList[i];
                    childComponent = this.childComponents[childComponentId];

                    if (childComponent.isMultiSelectable() === true) {
                        if (this.selectedComponentIds.indexOf(childComponentId) === -1) {
                            this.selectedComponentIds.push(childComponentId);

                            if ($.isFunction(childComponent.onSelect)) {
                                childComponent.onSelect.call(childComponent);
                            }
                        } else {
                            //child is already part of the selection

                            if ($.isFunction(childComponent.onDeselect)) {
                                childComponent.onDeselect.call(childComponent);
                            }
                            //remove from selection and deselect it
                            this.selectedComponentIds.splice(this.selectedComponentIds.indexOf(childComponentId), 1);

                        }
                    }
                }
            } else {
                //CTRL key is not pressed
                if (idList.length > 1) {
                    this._clearSelection();

                    for (i = 0; i < idList.length; i += 1) {
                        childComponentId = idList[i];
                        childComponent = this.childComponents[childComponentId];

                        if (childComponent.isMultiSelectable() === true) {
                            this.selectedComponentIds.push(childComponentId);

                            if ($.isFunction(childComponent.onSelect)) {
                                childComponent.onSelect.call(childComponent);
                            }
                        }
                    }
                } else {
                    childComponentId = idList[0];
                    childComponent = this.childComponents[childComponentId];

                    //if not yet in selection
                    if (this.selectedComponentIds.indexOf(childComponentId) === -1) {
                        this._clearSelection();

                        this.selectedComponentIds.push(childComponentId);

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect.call(childComponent);
                        }
                    }
                }
            }
        }

        this.logger.debug("selected components: " + this.selectedComponentIds);
    };

    ModelEditorCanvasComponent.prototype._clearSelection = function () {
        var i,
            childId,
            childComponent;

        for (i = 0; i < this.selectedComponentIds.length; i += 1) {
            childId = this.selectedComponentIds[i];
            childComponent = this.childComponents[childId];

            if (childComponent) {
                if ($.isFunction(childComponent.onDeselect)) {
                    childComponent.onDeselect.call(childComponent);
                }
            }
        }

        this.selectedComponentIds = [];
    };

    ModelEditorCanvasComponent.prototype._onDraggableHelper = function (event, childComponent) {
        var dragHelper = $("<div class='selected-components-drag-helper'></div>");

        dragHelper.css({ "position": "absolute",
            "left": childComponent.el.css("left"),
            "top": childComponent.el.css("top") });

        return dragHelper;
    };

    ModelEditorCanvasComponent.prototype._onDraggableStart = function (event, helper, draggedComponentId) {
        var i,
            id;

        this.logger.debug("_onDraggableStart: " + draggedComponentId);

        //simple drag means reposition
        //when SHIFT (CTRL) key is pressed when drag starts, selected models have to be copy-pasted
        this.dragOptions = {};
        if (event.shiftKey === true) {
            this.dragOptions.mode = this.dragModes.copy;
        } else {
            this.dragOptions.mode = this.dragModes.reposition;
        }

        this.dragOptions.selectionBBox = {};
        this.dragOptions.draggedElements = {};
        this.dragOptions.delta = { "x": 0, "y": 0 };
        this.dragOptions.startPos = { "x": 0, "y": 0 };
        this.dragOptions.draggedComponentId = draggedComponentId;

        for (i = 0; i < this.selectedComponentIds.length; i += 1) {
            id = this.selectedComponentIds[i];

            this.dragOptions.draggedElements[id] = {};

            if (this.dragOptions.mode === this.dragModes.copy) {
                this.dragOptions.draggedElements[id].el = this.childComponents[id].el.clone().attr("id", id + "_clone").css("opacity", "0.5");
                this.skinParts.childrenContainer.append(this.dragOptions.draggedElements[id].el);
            } else {
                this.dragOptions.draggedElements[id].el = this.childComponents[id].el;
            }

            this.dragOptions.draggedElements[id].originalPosition = {"x": parseInt(this.dragOptions.draggedElements[id].el.css("left"), 10), "y": parseInt(this.dragOptions.draggedElements[id].el.css("top"), 10) };

            if (id === draggedComponentId) {
                this.dragOptions.startPos.x = this.dragOptions.draggedElements[id].originalPosition.x;
                this.dragOptions.startPos.y = this.dragOptions.draggedElements[id].originalPosition.y;
            }

            if (i === 0) {
                this.dragOptions.selectionBBox.x = this.dragOptions.draggedElements[id].originalPosition.x;
                this.dragOptions.selectionBBox.y = this.dragOptions.draggedElements[id].originalPosition.y;
                this.dragOptions.selectionBBox.x2 = this.dragOptions.selectionBBox.x + this.dragOptions.draggedElements[id].el.outerWidth();
                this.dragOptions.selectionBBox.y2 = this.dragOptions.selectionBBox.y + this.dragOptions.draggedElements[id].el.outerHeight();
            } else {
                if (this.dragOptions.selectionBBox.x > this.dragOptions.draggedElements[id].originalPosition.x) {
                    this.dragOptions.selectionBBox.x = this.dragOptions.draggedElements[id].originalPosition.x;
                }
                if (this.dragOptions.selectionBBox.y > this.dragOptions.draggedElements[id].originalPosition.y) {
                    this.dragOptions.selectionBBox.y = this.dragOptions.draggedElements[id].originalPosition.y;
                }
                if (this.dragOptions.selectionBBox.x2 < this.dragOptions.draggedElements[id].originalPosition.x + this.dragOptions.draggedElements[id].el.outerWidth()) {
                    this.dragOptions.selectionBBox.x2 = this.dragOptions.draggedElements[id].originalPosition.x + this.dragOptions.draggedElements[id].el.outerWidth();
                }
                if (this.dragOptions.selectionBBox.y2 < this.dragOptions.draggedElements[id].originalPosition.y + this.dragOptions.draggedElements[id].el.outerHeight()) {
                    this.dragOptions.selectionBBox.y2 = this.dragOptions.draggedElements[id].originalPosition.y + this.dragOptions.draggedElements[id].el.outerHeight();
                }
            }
        }

        this.dragOptions.selectionBBox.w = this.dragOptions.selectionBBox.x2 - this.dragOptions.selectionBBox.x;
        this.dragOptions.selectionBBox.h = this.dragOptions.selectionBBox.y2 - this.dragOptions.selectionBBox.y;

        this.skinParts.dragPosPanel.text("X: " + this.dragOptions.selectionBBox.x + " Y: " + this.dragOptions.selectionBBox.y);
        this.skinParts.dragPosPanel.css({ "left": this.dragOptions.selectionBBox.x + (this.dragOptions.selectionBBox.w - this.skinParts.dragPosPanel.outerWidth()) / 2,
                                            "top": this.dragOptions.selectionBBox.y + this.dragOptions.selectionBBox.h + 10 });
        this.skinParts.dragPosPanel.show();
        this.logger.debug("Start dragging from original position X: " + this.dragOptions.startPos.x + ", Y: " + this.dragOptions.startPos.y);
    };

    ModelEditorCanvasComponent.prototype._onDraggableStop = function (event, helper) {
        var dragPos = { "x": parseInt(helper.css("left"), 10), "y": parseInt(helper.css("top"), 10) },
            dX = dragPos.x - this.dragOptions.startPos.x,
            dY = dragPos.y - this.dragOptions.startPos.y,
            i,
            id,
            childPosX,
            childPosY,
            intellyPasteOpts = { "parentId": this.getId() };

        //move all the selected children
        for (i = 0; i < this.selectedComponentIds.length; i += 1) {
            id = this.selectedComponentIds[i];
            childPosX = this.dragOptions.draggedElements[id].originalPosition.x + dX;
            childPosX = (childPosX < 0) ? 0 : childPosX;

            childPosY = this.dragOptions.draggedElements[id].originalPosition.y + dY;
            childPosY = (childPosY < 0) ? 0 : childPosY;

            if (this.dragOptions.mode === this.dragModes.copy) {
                intellyPasteOpts[id] = { "attributes": {}, registry: {} };
                intellyPasteOpts[id].registry[nodeRegistryNames.position] = { "x": childPosX, "y": childPosY };
                this.dragOptions.draggedElements[id].el.remove();
            } else {
                this.childComponents[id].setPosition(childPosX, childPosY);
            }
        }

        if (this.dragOptions.mode === this.dragModes.copy) {
            this.project.intellyPaste(intellyPasteOpts);
        }

        //delete dragOptions
        for (i in this.dragOptions) {
            if (this.dragOptions.hasOwnProperty(i)) {
                delete this.dragOptions[i];
            }
        }
        this.dragOptions = null;

        //remove UI helpers
        this.skinParts.dragPosPanel.hide();


    };

    ModelEditorCanvasComponent.prototype._onDraggableDrag = function (event, helper) {
        var dragPos = { "x": parseInt(helper.css("left"), 10), "y": parseInt(helper.css("top"), 10) },
            dX = dragPos.x - this.dragOptions.startPos.x,
            dY = dragPos.y - this.dragOptions.startPos.y,
            i,
            id,
            childPosX,
            childPosY,
            affectedConnectionEndPoints = [],
            subComponentId;

        if ((dX !== this.dragOptions.delta.x) || (dY !== this.dragOptions.delta.y)) {

            //move all the selected children
            for (i = 0; i < this.selectedComponentIds.length; i += 1) {
                id = this.selectedComponentIds[i];
                childPosX = this.dragOptions.draggedElements[id].originalPosition.x + dX;
                childPosX = (childPosX < 0) ? 0 : childPosX;

                childPosY = this.dragOptions.draggedElements[id].originalPosition.y + dY;
                childPosY = (childPosY < 0) ? 0 : childPosY;


                this.dragOptions.draggedElements[id].el.css({ "left": childPosX,
                    "top": childPosY });

                if (i === 0) {
                    this.dragOptions.selectionBBox.x = childPosX;
                    this.dragOptions.selectionBBox.y = childPosY;
                    this.dragOptions.selectionBBox.x2 = this.dragOptions.selectionBBox.x + this.dragOptions.draggedElements[id].el.outerWidth();
                    this.dragOptions.selectionBBox.y2 = this.dragOptions.selectionBBox.y + this.dragOptions.draggedElements[id].el.outerHeight();
                } else {
                    if (this.dragOptions.selectionBBox.x > childPosX) {
                        this.dragOptions.selectionBBox.x = childPosX;
                    }
                    if (this.dragOptions.selectionBBox.y > childPosY) {
                        this.dragOptions.selectionBBox.y = childPosY;
                    }
                    if (this.dragOptions.selectionBBox.x2 < childPosX + this.dragOptions.draggedElements[id].el.outerWidth()) {
                        this.dragOptions.selectionBBox.x2 = childPosX + this.dragOptions.draggedElements[id].el.outerWidth();
                    }
                    if (this.dragOptions.selectionBBox.y2 < childPosY + this.dragOptions.draggedElements[id].el.outerHeight()) {
                        this.dragOptions.selectionBBox.y2 = childPosY + this.dragOptions.draggedElements[id].el.outerHeight();
                    }
                }

            }
            this.dragOptions.selectionBBox.w = this.dragOptions.selectionBBox.x2 - this.dragOptions.selectionBBox.x;
            this.dragOptions.selectionBBox.h = this.dragOptions.selectionBBox.y2 - this.dragOptions.selectionBBox.y;

            //reposition drag-position panel
            this.skinParts.dragPosPanel.text("X: " + parseInt(this.dragOptions.draggedElements[this.dragOptions.draggedComponentId].el.css("left"), 10) + " Y: " + parseInt(this.dragOptions.draggedElements[this.dragOptions.draggedComponentId].el.css("top"), 10));
            this.skinParts.dragPosPanel.css({ "left": this.dragOptions.selectionBBox.x + (this.dragOptions.selectionBBox.w - this.skinParts.dragPosPanel.outerWidth()) / 2,
                "top": this.dragOptions.selectionBBox.y + this.dragOptions.selectionBBox.h + 10 });

            //redraw all the connections that are affected by the dragged objects
            // when necessary, because in copy mode, no need to redraw the connections
            if (this.dragOptions.mode === this.dragModes.reposition) {
                for (i = 0; i < this.selectedComponentIds.length; i += 1) {
                    affectedConnectionEndPoints.push(this.selectedComponentIds[i]);
                    for (subComponentId in this.displayedComponentIDs) {
                        if (this.displayedComponentIDs.hasOwnProperty(subComponentId)) {
                            if (this.displayedComponentIDs[subComponentId] === this.selectedComponentIds[i]) {
                                affectedConnectionEndPoints.push(subComponentId);
                            }
                        }
                    }
                }
                this._updateConnectionsWithEndPoint(affectedConnectionEndPoints);
            }

            this.dragOptions.delta = {"x": dX, "y": dY};
        }
    };

    ModelEditorCanvasComponent.prototype._getMousePos = function (e) {
        var childrenContainerOffset = this.skinParts.childrenContainer.offset();
        return { "mX": e.pageX - childrenContainerOffset.left,
            "mY": e.pageY - childrenContainerOffset.top };
    };

    ModelEditorCanvasComponent.prototype._onBackgroundMouseDown = function (event) {
        var mousePos = this._getMousePos(event),
            target = event.target || event.currentTarget;

        this.logger.debug("onBackgroundMouseDown: " + $(target).attr("id"));

        if (event.ctrlKey !== true) {
            this._clearSelection();
        }

        //start drawing selection rubberband
        this.selectionRubberBand = { "isDrawing": true,
                                    "bBox": {   "x": mousePos.mX,
                                                "y": mousePos.mY,
                                                "x2": mousePos.mX,
                                                "y2": mousePos.mY } };
        this._drawSelectionRubberBand();

        //event.stopPropagation();
    };

    ModelEditorCanvasComponent.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this._getMousePos(event);

        if (this.selectionRubberBand.isDrawing === true) {
            this.selectionRubberBand.bBox.x2 = mousePos.mX;
            this.selectionRubberBand.bBox.y2 = mousePos.mY;
            this._drawSelectionRubberBand();
        }
    };

    ModelEditorCanvasComponent.prototype._onBackgroundMouseUp = function (event) {
        var mousePos = this._getMousePos(event);

        if (this.selectionRubberBand.isDrawing === true) {
            this.selectionRubberBand.bBox.x2 = mousePos.mX;
            this.selectionRubberBand.bBox.y2 = mousePos.mY;

            this._drawSelectionRubberBand();

            this._selectChildrenByRubberBand(event.ctrlKey);
            this.skinParts.rubberBand.hide();

            this.selectionRubberBand = {};
        }
    };

    ModelEditorCanvasComponent.prototype._drawSelectionRubberBand = function () {
        var minEdgeLength = 2,
            tX = Math.min(this.selectionRubberBand.bBox.x, this.selectionRubberBand.bBox.x2),
            tX2 = Math.max(this.selectionRubberBand.bBox.x, this.selectionRubberBand.bBox.x2),
            tY = Math.min(this.selectionRubberBand.bBox.y, this.selectionRubberBand.bBox.y2),
            tY2 = Math.max(this.selectionRubberBand.bBox.y, this.selectionRubberBand.bBox.y2);

        if (tX2 - tX < minEdgeLength || tY2 - tY < minEdgeLength) {
            this.skinParts.rubberBand.hide();
        } else {
            this.skinParts.rubberBand.show();
        }

        this.skinParts.rubberBand.css({"left": tX,
                                        "top": tY });
        this.skinParts.rubberBand.outerWidth(tX2 - tX).outerHeight(tY2 - tY);
    };

    ModelEditorCanvasComponent.prototype._selectChildrenByRubberBand = function (ctrlPressed) {
        var i,
            rbBBox = {  "x":  Math.min(this.selectionRubberBand.bBox.x, this.selectionRubberBand.bBox.x2),
                "y": Math.min(this.selectionRubberBand.bBox.y, this.selectionRubberBand.bBox.y2),
                "x2": Math.max(this.selectionRubberBand.bBox.x, this.selectionRubberBand.bBox.x2),
                "y2": Math.max(this.selectionRubberBand.bBox.y, this.selectionRubberBand.bBox.y2) },
            childrenIDs = [],
            selectionContainsBBox;

        this.logger.debug("Select children by rubber band: [" + rbBBox.x + "," + rbBBox.y + "], [" + rbBBox.x2 + "," + rbBBox.y2 + "]");

        selectionContainsBBox = function (childBBox) {
            var interSectionRect,
                acceptRatio = 0.5,
                interSectionRatio;

            if (util.overlap(rbBBox, childBBox)) {
                interSectionRect = { "x": Math.max(childBBox.x, rbBBox.x),
                    "y": Math.max(childBBox.y, rbBBox.y),
                    "x2": Math.min(childBBox.x2, rbBBox.x2),
                    "y2": Math.min(childBBox.y2, rbBBox.y2) };

                interSectionRatio = (interSectionRect.x2 - interSectionRect.x) * (interSectionRect.y2 - interSectionRect.y) / ((childBBox.x2 - childBBox.x) * (childBBox.y2 - childBBox.y));
                if (interSectionRatio > acceptRatio) {
                    return true;
                }
            }

            return false;
        };

        for (i in this.childComponents) {
            if (this.childComponents.hasOwnProperty(i)) {
                if (this.childComponents[i].isMultiSelectable() === true) {
                    if (selectionContainsBBox(this.childComponents[i].getBoundingBox())) {
                        childrenIDs.push(i);
                    }
                }
            }
        }

        if (childrenIDs.length > 0) {
            this._setSelection(childrenIDs, ctrlPressed);
        }
    };

    ModelEditorCanvasComponent.prototype.startDrawConnection = function (srcId) {
        this.connectionInDraw.source = srcId;
        this.connectionInDraw.path.show();
    };

    ModelEditorCanvasComponent.prototype.onDrawConnection = function (event) {
        var mousePos = this._getMousePos(event);

        this._drawConnectionTo({"x": mousePos.mX, "y": mousePos.mY});
    };

    ModelEditorCanvasComponent.prototype._drawConnectionTo = function (toPosition) {
        var srcConnectionPoints,
            pathDefinition,
            sourceId = this.connectionInDraw.source,
            closestConnPoints;

        if (this.childComponents[sourceId]) {
            srcConnectionPoints = this.childComponents[sourceId].getConnectionPoints();
        } else if (this.displayedComponentIDs[sourceId]) {
            srcConnectionPoints = this.childComponents[this.displayedComponentIDs[sourceId]].getConnectionPointsById(sourceId);
        }

        closestConnPoints = this._getClosestPoints(srcConnectionPoints, [toPosition]);
        srcConnectionPoints = srcConnectionPoints[closestConnPoints[0]];

        pathDefinition = "M" + srcConnectionPoints.x + "," + srcConnectionPoints.y + "L" + toPosition.x + "," + toPosition.y;

        this.connectionInDraw.path.attr({ "path": pathDefinition});
    };

    //figure out the shortest side to choose between the two
    ModelEditorCanvasComponent.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints) {
        var d = {},
            dis = [],
            i,
            j,
            dx,
            dy,
            result = [];

        for (i = 0; i < srcConnectionPoints.length; i += 1) {
            if (srcConnectionPoints.hasOwnProperty(i)) {
                for (j = 0; j < tgtConnectionPoints.length; j += 1) {
                    if (tgtConnectionPoints.hasOwnProperty(j)) {
                        dx = Math.abs(srcConnectionPoints[i].x - tgtConnectionPoints[j].x);
                        dy = Math.abs(srcConnectionPoints[i].y - tgtConnectionPoints[j].y);

                        if (dis.indexOf(dy + dy) === -1) {
                            dis.push(dx + dy);
                            d[dis[dis.length - 1]] = [i, j];
                        }
                    }
                }
            }

        }

        if (dis.length !== 0) {
            result = d[Math.min.apply(Math, dis)];
        }

        return result;
    };

    ModelEditorCanvasComponent.prototype.endDrawConnection = function () {
        delete this.connectionInDraw.source;
        this.connectionInDraw.path.attr({"path": "M0,0"}).hide();
    };

    ModelEditorCanvasComponent.prototype.createConnection = function (sourceId, targetId) {
        this.logger.debug("createConnection from '" + sourceId + "' to '" + targetId + "' in parent '" + this.getId() + "'");
        this.project.makeConnection({   "parentId": this.getId(),
            "sourceId": sourceId,
            "targetId": targetId,
            "directed": true });
    };

    ModelEditorCanvasComponent.prototype.registerSubcomponents = function (list) {
        var i,
            registeredIds = [];

        for (i in list) {
            if (list.hasOwnProperty(i)) {
                this.displayedComponentIDs[i] = list[i];
                registeredIds.push(i);
            }
        }

        if (registeredIds.length > 0) {
            this._updateConnectionsWithEndPoint(registeredIds);
        }
    };

    ModelEditorCanvasComponent.prototype.unregisterSubcomponents = function (list) {
        var i,
            unregisteredIds = [];

        for (i in list) {
            if (list.hasOwnProperty(i)) {
                if (this.displayedComponentIDs.hasOwnProperty(i)) {
                    delete this.displayedComponentIDs[i];
                    unregisteredIds.push(i);
                }
            }
        }

        if (unregisteredIds.length > 0) {
            this._updateConnectionsWithEndPoint(unregisteredIds);
        }
    };

    ModelEditorCanvasComponent.prototype._updateConnectionsWithEndPoint = function (endPointList) {
        var i,
            connectionId,
            connectionIdsToUpdate = [],
            sourceId,
            targetId,
            sourceConnectionPoints,
            targetConnectionPoints,
            sourceCoordinates,
            targetCoordinates,
            closestConnPoints;

        for (i in this.connectionList) {
            if (this.connectionList.hasOwnProperty(i)) {
                if ((endPointList.indexOf(this.connectionList[i].sourceId) !== -1) || (endPointList.indexOf(this.connectionList[i].targetId) !== -1)) {
                    if (connectionIdsToUpdate.indexOf(this.connectionList[i]) === -1) {
                        connectionIdsToUpdate.push(i);
                    }
                }
            }
        }

        //we have all the connection IDs that needs to be updated
        for (i = 0; i < connectionIdsToUpdate.length; i += 1) {
            connectionId = connectionIdsToUpdate[i];

            //check if the connection's endpoints are displayed
            sourceId = this.connectionList[connectionId].sourceId;
            targetId = this.connectionList[connectionId].targetId;

            if ((this.childComponents[sourceId] || this.displayedComponentIDs[sourceId]) &&
                    (this.childComponents[targetId] || this.displayedComponentIDs[targetId])) {
                //both of the connection endpoints are known
                //if the connection is not displayed, add it
                //otherwise update it
                if (!this.childComponents.hasOwnProperty(connectionId)) {
                    this.addChild(new ModelEditorConnectionComponent(connectionId, this.project, this.skinParts.svgPaper));
                }

                //find the source end end coordinates and pass it to the connection
                if (this.childComponents[sourceId]) {
                    sourceConnectionPoints = this.childComponents[sourceId].getConnectionPoints();
                } else {
                    sourceConnectionPoints = this.childComponents[this.displayedComponentIDs[sourceId]].getConnectionPointsById(sourceId);
                }

                if (this.childComponents[targetId]) {
                    targetConnectionPoints = this.childComponents[targetId].getConnectionPoints();
                } else {
                    targetConnectionPoints = this.childComponents[this.displayedComponentIDs[targetId]].getConnectionPointsById(targetId);
                }

                if ((sourceConnectionPoints.length > 0) && (targetConnectionPoints.length > 0)) {
                    closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints);
                    sourceCoordinates = sourceConnectionPoints[closestConnPoints[0]];
                    targetCoordinates = targetConnectionPoints[closestConnPoints[1]];
                }

                this.childComponents[connectionId].redrawConnection(sourceCoordinates, targetCoordinates);
            } else {
                //at least one of the connection endpoint is not known
                //if the connection is displayed, remove it
                if (this.childComponents[connectionId]) {
                    this.removeChildById(connectionId);
                }
            }
        }
    };

    ModelEditorCanvasComponent.prototype._updateConnection = function (connectionId) {

    };

    ModelEditorCanvasComponent.prototype._refreshAllDisplayedComponentConnections = function () {
        var allComponentIDs = [],
            i;

        for (i in this.displayedComponentIDs) {
            if (this.displayedComponentIDs.hasOwnProperty(i)) {
                allComponentIDs.push(i);
            }
        }

        this._updateConnectionsWithEndPoint(allComponentIDs);
    };

    return ModelEditorCanvasComponent;
});