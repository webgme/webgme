"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'raphaeljs',
    './ComponentBase.js',
    './ModelEditorModelComponent.js',
    './ModelEditorConnectionComponent.js',
    'css!ModelEditorHTMLCSS/ModelEditorView'], function (logManager,
                                    util,
                                    commonUtil,
                                    raphaeljs,
                                    ComponentBase,
                                    ModelEditorModelComponent,
                                    ModelEditorConnectionComponent) {

    var ModelEditorView;

    ModelEditorView = function (containerElement) {
        this._logger = logManager.create("ModelEditorView_" + containerElement);

        this._el = $("#" + containerElement);

        if (this._el.length === 0) {
            this._logger.warning("ModelEditorView's container control with id:'" + containerElement + "' could not be found");
            return undefined;
        }

        this._initialize();

        this._logger.debug("Created");
    };

    ModelEditorView.prototype._initialize = function () {
        var self = this;

        this._el.append($('<div/>', {
            "class" : "modelEditorView"
        }));

        this._el = this._el.find("> .modelEditorView");

        //default view size
        this._defaultSize = { "w": 2000, "h": 1000 };

        this._gridSize = 10;

        this._childComponents = {};
        this._connectionList = {};

        this._selectedComponentIds = [];

        this._displayedComponentIDs = {};

        this._connectionInDraw = { "strokeWidth" : 2,
                                  "strokeColor" : "#FF7800",
                                  "lineType": "-" };

        //node title
        this._skinParts = {};
        this._skinParts.title = $('<div/>');
        this._skinParts.title.addClass("modelEditorViewTitle");
        this._el.append(this._skinParts.title);

        //children container
        this._skinParts.childrenContainer = $('<div/>', {
            "class" : "children",
            "id": commonUtil.guid(),
            "tabindex": 0
        });
        this._skinParts.childrenContainer.css("position", "absolute");
        this._skinParts.childrenContainer.outerWidth(this._defaultSize.w).outerHeight(this._defaultSize.h);
        this._el.append(this._skinParts.childrenContainer);

        //hook up mousedown on background
        this._skinParts.childrenContainer.bind('mousedown', function (event) {
            self._onBackgroundMouseDown.call(self, event);
        });

        this._skinParts.childrenContainer.bind('keydown', function (event) {
            self._onBackgroundKeyDown(event);
        });

        this._skinParts.dragPosPanel = $('<div/>', {
            "class" : "dragPosPanel"
        });
        this._skinParts.childrenContainer.append(this._skinParts.dragPosPanel);

        this._skinParts.rubberBand = $('<div/>', {
            "class" : "rubberBand"
        });
        this._skinParts.childrenContainer.append(this._skinParts.rubberBand);
        this._skinParts.rubberBand.hide();

        //initialize Raphael paper from children container and set it to be full size of the HTML container
        this._skinParts.svgPaper = Raphael(this._skinParts.childrenContainer.attr("id"));
        this._skinParts.svgPaper.canvas.style.pointerEvents = "visiblePainted";
        //this._skinParts.svgPaper.setSize("100%", "100%");
        this._skinParts.svgPaper.setSize(this._defaultSize.w, this._defaultSize.h);
        this._skinParts.svgPaper.setViewBox(0, 0, this._defaultSize.w, this._defaultSize.h, false);

        //create connection line instance
        this._connectionInDraw.path = this._skinParts.svgPaper.path("M0,0").attr(
            {   "stroke-width": this._connectionInDraw.strokeWidth,
                "stroke": this._connectionInDraw.strokeColor,
                "stroke-dasharray": this._connectionInDraw.lineType}
        ).hide();
    };

    ModelEditorView.prototype.clear = function () {
        var i;
        for (i in this._childComponents) {
            if (this._childComponents.hasOwnProperty(i)) {
                this._childComponents[i].destroy();
                delete this._childComponents[i];

                if (this._connectionList.hasOwnProperty(i)) {
                    delete this._connectionList[i];
                }
            }
        }
    };

    ModelEditorView.prototype.updateCanvas = function (desc) {
        //apply content to controls based on desc
        this._skinParts.title.text(desc.name);
    };

    ModelEditorView.prototype.createComponent = function (objDescriptor) {
        var self = this,
            componentId = objDescriptor.id,
            newComponent;

        this._logger.debug("Creating component with parameters: " + JSON.stringify(objDescriptor));

        objDescriptor.modelEditorView = this;

        if (objDescriptor.kind === "MODEL") {
            newComponent = this._childComponents[componentId] = new ModelEditorModelComponent(objDescriptor);

            this._skinParts.childrenContainer.append(this._childComponents[componentId].el);

            //hook up reposition handler
            this._childComponents[componentId].el.css("cursor", "move");
            this._childComponents[componentId].el.draggable({
                zIndex: 100000,
                grid: [self._gridSize, self._gridSize],
                helper: function (event) {
                    return self._onDraggableHelper.call(self, event, componentId);
                },
                start: function (event, ui) {
                    return self._onDraggableStart.call(self, event, ui.helper, componentId);
                },
                stop: function (event, ui) {
                    return self._onDraggableStop.call(self, event, ui.helper);
                },
                drag: function (event, ui) {
                    return self._onDraggableDrag.call(self, event, ui.helper);
                }
            });

            //finally render component
            this._childComponents[objDescriptor.id].render();
        } else if (objDescriptor.kind === "CONNECTION") {
            //if it is a CONNECTION, store its info in the connection list
            //if not both ends are already shown the connection will be created when the end-objects appear on the canvas
            objDescriptor.paper = this._skinParts.svgPaper;

            this._connectionList[componentId] = { "sourceId": objDescriptor.source,
                                                  "targetId": objDescriptor.target };

            newComponent = this._childComponents[componentId] = new ModelEditorConnectionComponent(objDescriptor);

            this._skinParts.childrenContainer.append(newComponent.el);
            this._updateConnectionCoordinates(componentId);
        }

        return newComponent;
    };

    ModelEditorView.prototype.deleteComponent = function (component) {
        var componentId = component.getId();
        if (this._childComponents[componentId]) {
            this._childComponents[componentId].destroy();
            delete this._childComponents[componentId];
        }

        //if it was a connection
        if (this._connectionList[componentId]) {
            delete this._connectionList[componentId];
        }
    };

    ModelEditorView.prototype.updateComponent = function (component, objDescriptor) {
        if (this._childComponents[objDescriptor.id]) {
            this._childComponents[objDescriptor.id].update(objDescriptor);
        }

        //if it was a connection
        if (this._connectionList[objDescriptor.id]) {
            this._connectionList[objDescriptor.id] = { "sourceId": objDescriptor.source,
                "targetId": objDescriptor.target };

            this._updateConnectionCoordinates(objDescriptor.id);
        }
    };

    ModelEditorView.prototype._getMousePos = function (e) {
        var childrenContainerOffset = this._skinParts.childrenContainer.offset();
        return { "mX": e.pageX - childrenContainerOffset.left,
            "mY": e.pageY - childrenContainerOffset.top };
    };

    ModelEditorView.prototype.startDrawConnection = function (srcId) {
        this._connectionInDraw.source = srcId;
        this._connectionInDraw.path.show();
    };

    ModelEditorView.prototype.onDrawConnection = function (event) {
        var mousePos = this._getMousePos(event);

        this._drawConnectionTo({"x": mousePos.mX, "y": mousePos.mY});
    };

    ModelEditorView.prototype.endDrawConnection = function () {
        delete this._connectionInDraw.source;
        this._connectionInDraw.path.attr({"path": "M0,0"}).hide();
    };

    ModelEditorView.prototype._drawConnectionTo = function (toPosition) {
        var srcConnectionPoints,
            pathDefinition,
            sourceId = this._connectionInDraw.source,
            closestConnPoints;

        if (this._childComponents[sourceId]) {
            srcConnectionPoints = this._childComponents[sourceId].getConnectionPoints();
        } else if (this._displayedComponentIDs[sourceId]) {
            srcConnectionPoints = this._childComponents[this._displayedComponentIDs[sourceId]].getConnectionPointsById(sourceId);
        }

        closestConnPoints = this._getClosestPoints(srcConnectionPoints, [toPosition]);
        srcConnectionPoints = srcConnectionPoints[closestConnPoints[0]];

        pathDefinition = "M" + srcConnectionPoints.x + "," + srcConnectionPoints.y + "L" + toPosition.x + "," + toPosition.y;

        this._connectionInDraw.path.attr({ "path": pathDefinition});
    };

    //figure out the shortest side to choose between the two
    ModelEditorView.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints) {
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

    ModelEditorView.prototype.createConnection = function (data) {
        var updateData = {};
        if (data.sourceId && data.targetId) {
            this.onCreateConnection({ "sourceId": data.sourceId,
                "targetId": data.targetId });
        } else if (data.connId) {
            updateData = { "connectionId": data.connId,
                "endType": data.endType,
                "oldValue": data.endType === "source" ? this._connectionList[data.connId].sourceId : this._connectionList[data.connId].targetId,
                "newValue": data.targetId };

            if (updateData.oldValue !== updateData.newValue) {
                if (updateData.endType === "source") {
                    this._connectionList[updateData.connectionId].sourceId = updateData.newValue;
                } else {
                    this._connectionList[updateData.connectionId].targetId = updateData.newValue;
                }

                this._updateConnectionCoordinates(updateData.connectionId);

                this.onUpdateConnectionEnd(updateData);
            } else {
                this._updateConnectionCoordinates(updateData.connectionId);
            }
        }
    };

    ModelEditorView.prototype.childBBoxChanged = function (childComponentId) {
        var affectedConnectionEndPoints = [],
            subComponentId;

        //check children's X;Y position based on this parent's layout settings
        this._positionChildOnCanvas(childComponentId);

        //redraw affected connections
        affectedConnectionEndPoints.push(childComponentId);
        for (subComponentId in this._displayedComponentIDs) {
            if (this._displayedComponentIDs.hasOwnProperty(subComponentId)) {
                if (this._displayedComponentIDs[subComponentId] === childComponentId) {
                    affectedConnectionEndPoints.push(subComponentId);
                }
            }
        }
        this._updateConnectionsWithEndPoint(affectedConnectionEndPoints);

        //check if current children container's width and height are big enough to contain the children
        this._adjustChildrenContainerSize(childComponentId);
    };

    ModelEditorView.prototype._positionChildOnCanvas = function (childComponentId) {
        var childComponent = this._childComponents[childComponentId],
            childComponentEl = childComponent.el,
            pX = parseInt(childComponentEl.css("left"), 10),
            pY = parseInt(childComponentEl.css("top"), 10),
            posXDelta,
            posYDelta;

        //correct the children position based on this skin's granularity
        posXDelta = pX % this._gridSize;
        posYDelta = pY % this._gridSize;

        if ((posXDelta !== 0) || (posYDelta !== 0)) {
            pX += (posXDelta < Math.floor(this._gridSize / 2) + 1 ? -1 * posXDelta : this._gridSize - posXDelta);
            pY += (posYDelta < Math.floor(this._gridSize / 2) + 1 ? -1 * posYDelta : this._gridSize - posYDelta);

            childComponent.setPosition(pX, pY);
        }
    };

    ModelEditorView.prototype._adjustChildrenContainerSize = function (childComponentId) {
        var childComponent = this._childComponents[childComponentId],
            cW = this._skinParts.childrenContainer.outerWidth(),
            cH = this._skinParts.childrenContainer.outerHeight(),
            childBBox = childComponent.getBoundingBox(),
            cW2 = cW,
            cH2 = cH;

        if (cW < childBBox.x2) {
            cW2 = childBBox.x2 + 100;
            this._skinParts.childrenContainer.outerWidth(cW2);
        }
        if (cH < childBBox.y2) {
            cH2 = childBBox.y2 + 100;
            this._skinParts.childrenContainer.outerHeight(cH2);
        }

        if ((cW !== cW2) || (cH !== cH2)) {
            this._skinParts.svgPaper.setSize(cW2, cH2);
            this._skinParts.svgPaper.setViewBox(0, 0, cW2, cH2, false);
        }
    };


    /*
     * COMPONENT SELECTION BY CLICKING ON THE COMPONENT
     */
    ModelEditorView.prototype.onComponentMouseDown = function (event, componentId) {
        this._logger.debug("onComponentMouseDown: " + componentId);

        //mousedown initiates a component selection
        this._setSelection([componentId], event.ctrlKey);

        event.stopPropagation();
        event.preventDefault();
    };

    ModelEditorView.prototype.onComponentMouseUp = function (event, componentId) {
        this._logger.debug("onComponentMouseUp: " + componentId);

        //mouseup initiates an already selected component's unselection
        this._deselect(componentId, event.ctrlKey);

        //event.stopPropagation();
        //event.preventDefault();
    };

    ModelEditorView.prototype._deselect = function (componentId, ctrlPressed) {
        var childComponent = this._childComponents[componentId];

        if (ctrlPressed === true) {
            if (this._lastSelected !== componentId) {
                if (this._selectedComponentIds.indexOf(componentId) !== -1) {
                    //child is already part of the selection
                    //remove from selection and deselect it

                    this._selectedComponentIds.splice(this._selectedComponentIds.indexOf(componentId), 1);

                    if ($.isFunction(childComponent.onDeselect)) {
                        childComponent.onDeselect();
                    }
                }
            }
        }

        delete this._lastSelected;
    };

    ModelEditorView.prototype._setSelection = function (idList, ctrlPressed) {
        var i,
            childComponent,
            childComponentId;

        this._logger.debug("_setSelection: " + idList + ", ctrlPressed: " + ctrlPressed);

        if (idList.length > 0) {
            if (ctrlPressed === true) {
                //while CTRL key is pressed, add/remove ids to the selection
                //first let the already selected items know that they are participating in a multiple selection from now on
                for (i = 0; i < this._selectedComponentIds.length; i += 1) {
                    childComponentId = this._selectedComponentIds[i];
                    childComponent = this._childComponents[childComponentId];

                    if ($.isFunction(childComponent.onDeselect)) {
                        childComponent.onDeselect();
                    }

                    if ($.isFunction(childComponent.onSelect)) {
                        childComponent.onSelect(true);
                    }
                }

                for (i = 0; i < idList.length; i += 1) {
                    childComponentId = idList[i];
                    childComponent = this._childComponents[childComponentId];

                    if (this._selectedComponentIds.indexOf(childComponentId) === -1) {
                        this._selectedComponentIds.push(childComponentId);

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect(idList.length + this._selectedComponentIds.length > 1);
                        }

                        if (idList.length === 1) {
                            this._lastSelected = idList[0];
                        }
                    }
                }
            } else {
                //CTRL key is not pressed
                if (idList.length > 1) {
                    this._clearSelection();

                    for (i = 0; i < idList.length; i += 1) {
                        childComponentId = idList[i];
                        childComponent = this._childComponents[childComponentId];

                        this._selectedComponentIds.push(childComponentId);

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect(true);
                        }
                    }
                } else {
                    childComponentId = idList[0];
                    childComponent = this._childComponents[childComponentId];

                    //if not yet in selection
                    if (this._selectedComponentIds.indexOf(childComponentId) === -1) {
                        this._clearSelection();

                        this._selectedComponentIds.push(childComponentId);

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect(false);
                        }
                    }
                }
            }
        }

        this._logger.debug("selected components: " + this._selectedComponentIds);
    };

    ModelEditorView.prototype._selectAll = function () {
        var childrenIDs = [],
            i;

        for (i in this._childComponents) {
            if (this._childComponents.hasOwnProperty(i)) {
                if (this._childComponents[i].isVisible() === true) {
                    childrenIDs.push(i);
                }
            }
        }

        if (childrenIDs.length > 0) {
            this._setSelection(childrenIDs, false);
        }
    };

    ModelEditorView.prototype._clearSelection = function () {
        var i,
            childId,
            childComponent;

        for (i = 0; i < this._selectedComponentIds.length; i += 1) {
            childId = this._selectedComponentIds[i];
            childComponent = this._childComponents[childId];

            if (childComponent) {
                if ($.isFunction(childComponent.onDeselect)) {
                    childComponent.onDeselect();
                }
            }
        }

        this._selectedComponentIds = [];
    };

    /*
     * RUBBERBAND SELECTION
     */
    ModelEditorView.prototype._onBackgroundMouseDown = function (event) {
        var mousePos = this._getMousePos(event),
            self = this;

        if (event.ctrlKey !== true) {
            this._clearSelection();
        }

        //start drawing selection rubberband
        this._selectionRubberBand = { "isDrawing": true,
            "bBox": {   "x": mousePos.mX,
                "y": mousePos.mY,
                "x2": mousePos.mX,
                "y2": mousePos.mY } };

        this._drawSelectionRubberBand();

        //hook up MouseMove and MouseUp
        this._onBackgroundMouseMoveCallBack = function (event) {
            self._onBackgroundMouseMove.call(self, event);
        };

        this._onBackgroundMouseUpCallBack = function (event) {
            self._onBackgroundMouseUp.call(self, event);
        };

        this._skinParts.childrenContainer.bind('mousemove', this._onBackgroundMouseMoveCallBack);
        this._skinParts.childrenContainer.bind('mouseup', this._onBackgroundMouseUpCallBack);

        event.stopPropagation();
    };

    ModelEditorView.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this._getMousePos(event);

        if (this._selectionRubberBand.isDrawing && this._selectionRubberBand.isDrawing === true) {
            this._selectionRubberBand.bBox.x2 = mousePos.mX;
            this._selectionRubberBand.bBox.y2 = mousePos.mY;
            this._drawSelectionRubberBand();
        }
    };

    ModelEditorView.prototype._onBackgroundMouseUp = function (event) {
        var mousePos = this._getMousePos(event);

        if (this._selectionRubberBand.isDrawing && this._selectionRubberBand.isDrawing === true) {
            this._selectionRubberBand.bBox.x2 = mousePos.mX;
            this._selectionRubberBand.bBox.y2 = mousePos.mY;

            this._drawSelectionRubberBand();

            this._selectChildrenByRubberBand(event.ctrlKey);
            this._skinParts.rubberBand.hide();

            //unbind mousemove and mouseup handlers
            this._skinParts.childrenContainer.unbind('mousemove', this._onBackgroundMouseMoveCallBack);
            this._skinParts.childrenContainer.unbind('mouseup', this._onBackgroundMouseUpCallBack);

            //delete unnecessary instance members
            delete this._selectionRubberBand;
            delete this._onBackgroundMouseMoveCallBack;
            delete this._onBackgroundMouseUpCallBack;
        }
    };



    ModelEditorView.prototype._drawSelectionRubberBand = function () {
        var minEdgeLength = 2,
            tX = Math.min(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
            tX2 = Math.max(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
            tY = Math.min(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2),
            tY2 = Math.max(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2);

        if (tX2 - tX < minEdgeLength || tY2 - tY < minEdgeLength) {
            this._skinParts.rubberBand.hide();
        } else {
            this._skinParts.rubberBand.show();
        }

        this._skinParts.rubberBand.css({"left": tX,
            "top": tY });
        this._skinParts.rubberBand.outerWidth(tX2 - tX).outerHeight(tY2 - tY);
    };

    ModelEditorView.prototype._selectChildrenByRubberBand = function (ctrlPressed) {
        var i,
            rbBBox = {  "x":  Math.min(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
                "y": Math.min(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2),
                "x2": Math.max(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
                "y2": Math.max(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2) },
            childrenIDs = [],
            selectionContainsBBox;

        this._logger.debug("Select children by rubber band: [" + rbBBox.x + "," + rbBBox.y + "], [" + rbBBox.x2 + "," + rbBBox.y2 + "]");

        selectionContainsBBox = function (childBBox) {
            var interSectionRect,
                acceptRatio = 0.5,
                interSectionRatio;

            if (childBBox) {
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
            }

            return false;
        };

        for (i in this._childComponents) {
            if (this._childComponents.hasOwnProperty(i)) {
                if (selectionContainsBBox(this._childComponents[i].getBoundingBox())) {
                    childrenIDs.push(i);
                }
            }
        }

        if (childrenIDs.length > 0) {
            this._setSelection(childrenIDs, ctrlPressed);
        }
    };
    /*
     * END OF - RUBBERBAND SELECTION
     */

    /*
     * MODELCOMPONENT REPOSITION HANDLERS
     */
    ModelEditorView.prototype._onDraggableHelper = function (event, componentId) {
        var dragHelper = $("<div class='selected-components-drag-helper'></div>"),
            childComponent = this._childComponents[componentId];

        dragHelper.css({ "position": "absolute",
            "left": childComponent.el.css("left"),
            "top": childComponent.el.css("top") });

        return dragHelper;
    };

    ModelEditorView.prototype._onDraggableStart = function (event, helper, draggedComponentId) {
        var i,
            id;

        this._logger.debug("_onDraggableStart: " + draggedComponentId);

        //simple drag means reposition
        //when CTRL key is pressed when drag starts, selected models have to be copy-pasted
        this._dragOptions = {};
        this._dragModes = {"copy": 0,
            "reposition": 1};

        if (event.ctrlKey === true) {
            this._dragOptions.mode = this._dragModes.copy;
        } else {
            this._dragOptions.mode = this._dragModes.reposition;
        }

        this._dragOptions.selectionBBox = {};
        this._dragOptions.draggedElements = {};
        this._dragOptions.delta = { "x": 0, "y": 0 };
        this._dragOptions.startPos = { "x": 0, "y": 0 };
        this._dragOptions.draggedComponentId = draggedComponentId;

        for (i = 0; i < this._selectedComponentIds.length; i += 1) {
            id = this._selectedComponentIds[i];

            this._dragOptions.draggedElements[id] = {};

            if (this._dragOptions.mode === this._dragModes.copy) {
                this._dragOptions.draggedElements[id].el = this._childComponents[id].el.clone().attr("id", id + "_clone").css("opacity", "0.5");
                this._skinParts.childrenContainer.append(this._dragOptions.draggedElements[id].el);
            } else {
                this._dragOptions.draggedElements[id].el = this._childComponents[id].el;
            }

            this._dragOptions.draggedElements[id].originalPosition = {"x": parseInt(this._dragOptions.draggedElements[id].el.css("left"), 10), "y": parseInt(this._dragOptions.draggedElements[id].el.css("top"), 10) };

            if (id === draggedComponentId) {
                this._dragOptions.startPos.x = this._dragOptions.draggedElements[id].originalPosition.x;
                this._dragOptions.startPos.y = this._dragOptions.draggedElements[id].originalPosition.y;
            }

            if (this._connectionList.hasOwnProperty(id) === false) {
                if (i === 0) {
                    this._dragOptions.selectionBBox.x = this._dragOptions.draggedElements[id].originalPosition.x;
                    this._dragOptions.selectionBBox.y = this._dragOptions.draggedElements[id].originalPosition.y;
                    this._dragOptions.selectionBBox.x2 = this._dragOptions.selectionBBox.x + this._dragOptions.draggedElements[id].el.outerWidth();
                    this._dragOptions.selectionBBox.y2 = this._dragOptions.selectionBBox.y + this._dragOptions.draggedElements[id].el.outerHeight();
                } else {
                    if (this._dragOptions.selectionBBox.x > this._dragOptions.draggedElements[id].originalPosition.x) {
                        this._dragOptions.selectionBBox.x = this._dragOptions.draggedElements[id].originalPosition.x;
                    }
                    if (this._dragOptions.selectionBBox.y > this._dragOptions.draggedElements[id].originalPosition.y) {
                        this._dragOptions.selectionBBox.y = this._dragOptions.draggedElements[id].originalPosition.y;
                    }
                    if (this._dragOptions.selectionBBox.x2 < this._dragOptions.draggedElements[id].originalPosition.x + this._dragOptions.draggedElements[id].el.outerWidth()) {
                        this._dragOptions.selectionBBox.x2 = this._dragOptions.draggedElements[id].originalPosition.x + this._dragOptions.draggedElements[id].el.outerWidth();
                    }
                    if (this._dragOptions.selectionBBox.y2 < this._dragOptions.draggedElements[id].originalPosition.y + this._dragOptions.draggedElements[id].el.outerHeight()) {
                        this._dragOptions.selectionBBox.y2 = this._dragOptions.draggedElements[id].originalPosition.y + this._dragOptions.draggedElements[id].el.outerHeight();
                    }
                }
            }
        }

        this._dragOptions.selectionBBox.w = this._dragOptions.selectionBBox.x2 - this._dragOptions.selectionBBox.x;
        this._dragOptions.selectionBBox.h = this._dragOptions.selectionBBox.y2 - this._dragOptions.selectionBBox.y;

        this._skinParts.dragPosPanel.text("X: " + this._dragOptions.selectionBBox.x + " Y: " + this._dragOptions.selectionBBox.y);
        this._skinParts.dragPosPanel.css({ "left": this._dragOptions.selectionBBox.x + (this._dragOptions.selectionBBox.w - this._skinParts.dragPosPanel.outerWidth()) / 2,
            "top": this._dragOptions.selectionBBox.y + this._dragOptions.selectionBBox.h + 10 });
        this._skinParts.dragPosPanel.show();
        this._logger.debug("Start dragging from original position X: " + this._dragOptions.startPos.x + ", Y: " + this._dragOptions.startPos.y);
    };

    ModelEditorView.prototype._onDraggableStop = function (event, helper) {
        var dragPos = { "x": parseInt(helper.css("left"), 10), "y": parseInt(helper.css("top"), 10) },
            dX = dragPos.x - this._dragOptions.startPos.x,
            dY = dragPos.y - this._dragOptions.startPos.y,
            i,
            id,
            childPosX,
            childPosY,
            copyOpts = {};

        //move all the selected children
        for (i = 0; i < this._selectedComponentIds.length; i += 1) {
            id = this._selectedComponentIds[i];
            childPosX = this._dragOptions.draggedElements[id].originalPosition.x + dX;
            childPosX = (childPosX < 0) ? 0 : childPosX;

            childPosY = this._dragOptions.draggedElements[id].originalPosition.y + dY;
            childPosY = (childPosY < 0) ? 0 : childPosY;

            copyOpts[id] = { "x": childPosX, "y": childPosY };

            if (this._dragOptions.mode === this._dragModes.copy) {
                this._dragOptions.draggedElements[id].el.remove();
            } else {
                if ($.isFunction(this._childComponents[id].setPosition)) {
                    this._childComponents[id].setPosition(childPosX, childPosY);
                }
                //this._childComponents[id].setPosition(childPosX, childPosY);
            }
        }

        if (this._dragOptions.mode === this._dragModes.copy) {
            //TODO: copyOpts here should not contain x,y for connections
            this.onDragCopy(copyOpts);
        } else {
            this.onReposition(copyOpts);
        }

        //delete dragOptions
        for (i in this._dragOptions) {
            if (this._dragOptions.hasOwnProperty(i)) {
                delete this._dragOptions[i];
            }
        }
        this._dragOptions = null;

        //remove UI helpers
        this._skinParts.dragPosPanel.hide();


    };

    ModelEditorView.prototype._onDraggableDrag = function (event, helper) {
        var dragPos = { "x": parseInt(helper.css("left"), 10), "y": parseInt(helper.css("top"), 10) },
            dX = dragPos.x - this._dragOptions.startPos.x,
            dY = dragPos.y - this._dragOptions.startPos.y,
            i,
            id,
            childPosX,
            childPosY,
            affectedConnectionEndPoints = [],
            subComponentId;

        if ((dX !== this._dragOptions.delta.x) || (dY !== this._dragOptions.delta.y)) {

            //move all the selected children
            for (i = 0; i < this._selectedComponentIds.length; i += 1) {
                id = this._selectedComponentIds[i];
                childPosX = this._dragOptions.draggedElements[id].originalPosition.x + dX;
                childPosX = (childPosX < 0) ? 0 : childPosX;

                childPosY = this._dragOptions.draggedElements[id].originalPosition.y + dY;
                childPosY = (childPosY < 0) ? 0 : childPosY;


                //TODO: make a difference in copy and reposition mode
                //TODO: and do not move that is not necessary
                if (this._dragOptions.mode === this._dragModes.reposition) {
                    if ($.isFunction(this._childComponents[id].setPosition)) {
                        this._childComponents[id].setPosition(childPosX, childPosY);
                    }
                } else {
                    this._dragOptions.draggedElements[id].el.css({ "left": childPosX,
                        "top": childPosY });
                }

                if (this._connectionList.hasOwnProperty(id) === false) {
                    if (i === 0) {
                        this._dragOptions.selectionBBox.x = childPosX;
                        this._dragOptions.selectionBBox.y = childPosY;
                        this._dragOptions.selectionBBox.x2 = this._dragOptions.selectionBBox.x + this._dragOptions.draggedElements[id].el.outerWidth();
                        this._dragOptions.selectionBBox.y2 = this._dragOptions.selectionBBox.y + this._dragOptions.draggedElements[id].el.outerHeight();
                    } else {
                        if (this._dragOptions.selectionBBox.x > childPosX) {
                            this._dragOptions.selectionBBox.x = childPosX;
                        }
                        if (this._dragOptions.selectionBBox.y > childPosY) {
                            this._dragOptions.selectionBBox.y = childPosY;
                        }
                        if (this._dragOptions.selectionBBox.x2 < childPosX + this._dragOptions.draggedElements[id].el.outerWidth()) {
                            this._dragOptions.selectionBBox.x2 = childPosX + this._dragOptions.draggedElements[id].el.outerWidth();
                        }
                        if (this._dragOptions.selectionBBox.y2 < childPosY + this._dragOptions.draggedElements[id].el.outerHeight()) {
                            this._dragOptions.selectionBBox.y2 = childPosY + this._dragOptions.draggedElements[id].el.outerHeight();
                        }
                    }
                }

            }
            this._dragOptions.selectionBBox.w = this._dragOptions.selectionBBox.x2 - this._dragOptions.selectionBBox.x;
            this._dragOptions.selectionBBox.h = this._dragOptions.selectionBBox.y2 - this._dragOptions.selectionBBox.y;

            //reposition drag-position panel
            this._skinParts.dragPosPanel.text("X: " + parseInt(this._dragOptions.draggedElements[this._dragOptions.draggedComponentId].el.css("left"), 10) + " Y: " + parseInt(this._dragOptions.draggedElements[this._dragOptions.draggedComponentId].el.css("top"), 10));
            this._skinParts.dragPosPanel.css({ "left": this._dragOptions.selectionBBox.x + (this._dragOptions.selectionBBox.w - this._skinParts.dragPosPanel.outerWidth()) / 2,
                "top": this._dragOptions.selectionBBox.y + this._dragOptions.selectionBBox.h + 10 });

            //redraw all the connections that are affected by the dragged objects
            // when necessary, because in copy mode, no need to redraw the connections
            if (this._dragOptions.mode === this._dragModes.reposition) {
                for (i = 0; i < this._selectedComponentIds.length; i += 1) {
                    affectedConnectionEndPoints.push(this._selectedComponentIds[i]);
                    for (subComponentId in this._displayedComponentIDs) {
                        if (this._displayedComponentIDs.hasOwnProperty(subComponentId)) {
                            if (this._displayedComponentIDs[subComponentId] === this._selectedComponentIds[i]) {
                                affectedConnectionEndPoints.push(subComponentId);
                            }
                        }
                    }
                }
                this._updateConnectionsWithEndPoint(affectedConnectionEndPoints);
            }

            this._dragOptions.delta = {"x": dX, "y": dY};
        }
    };
    /*
     * END OF - MODELCOMPONENT REPOSITION HANDLERS
     */

    /*
     * UPDATE CONNECTIONS
     */
    ModelEditorView.prototype._updateConnectionsWithEndPoint = function (endPointList) {
        var i,
            connectionIdsToUpdate = [];


        for (i in this._connectionList) {
            if (this._connectionList.hasOwnProperty(i)) {
                if ((endPointList.indexOf(this._connectionList[i].sourceId) !== -1) ||
                        (endPointList.indexOf(this._connectionList[i].targetId) !== -1)) {
                    if (connectionIdsToUpdate.indexOf(this._connectionList[i]) === -1) {
                        connectionIdsToUpdate.push(i);
                    }
                }
            }
        }

        for (i = 0; i < connectionIdsToUpdate.length; i += 1) {
            this._updateConnectionCoordinates(connectionIdsToUpdate[i]);
        }
    };

    ModelEditorView.prototype._updateConnectionCoordinates = function (connectionId) {
        var connection = this._childComponents[connectionId],
            sourceId = this._connectionList[connectionId].sourceId,
            targetId = this._connectionList[connectionId].targetId,
            sourceConnectionPoints,
            targetConnectionPoints,
            sourceCoordinates,
            targetCoordinates,
            closestConnPoints;

        if ((this._childComponents[sourceId] || this._displayedComponentIDs[sourceId]) &&
                (this._childComponents[targetId] || this._displayedComponentIDs[targetId])) {
            //both of the connection endpoints are known

            //find the source end end coordinates and pass it to the connection
            if (this._childComponents[sourceId]) {
                sourceConnectionPoints = this._childComponents[sourceId].getConnectionPoints();
            } else {
                sourceConnectionPoints = this._childComponents[this._displayedComponentIDs[sourceId]].getConnectionPointsById(sourceId);
            }

            if (this._childComponents[targetId]) {
                targetConnectionPoints = this._childComponents[targetId].getConnectionPoints();
            } else {
                targetConnectionPoints = this._childComponents[this._displayedComponentIDs[targetId]].getConnectionPointsById(targetId);
            }

            if ((sourceConnectionPoints.length > 0) && (targetConnectionPoints.length > 0)) {
                closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints);
                sourceCoordinates = sourceConnectionPoints[closestConnPoints[0]];
                targetCoordinates = targetConnectionPoints[closestConnPoints[1]];
            }

            connection.setEndpointCoordinates(sourceCoordinates, targetCoordinates);
        } else {
            connection.setEndpointCoordinates(null, null);
        }
    };

    /*
     * END OF UPDATE CONNECTIONS
     */

    /*
     * SUBCOMPONENTS REGISTERED BY THE DECORATORS
     */
    ModelEditorView.prototype.registerSubcomponents = function (list) {
        var i,
            registeredIds = [];

        for (i in list) {
            if (list.hasOwnProperty(i)) {
                this._displayedComponentIDs[i] = list[i];
                registeredIds.push(i);
            }
        }

        if (registeredIds.length > 0) {
            this._updateConnectionsWithEndPoint(registeredIds);
        }
    };

    ModelEditorView.prototype.unregisterSubcomponents = function (list) {
        var i,
            unregisteredIds = [];

        for (i in list) {
            if (list.hasOwnProperty(i)) {
                if (this._displayedComponentIDs.hasOwnProperty(i)) {
                    delete this._displayedComponentIDs[i];
                    unregisteredIds.push(i);
                }
            }
        }

        if (unregisteredIds.length > 0) {
            this._updateConnectionsWithEndPoint(unregisteredIds);
        }
    };
    /*
     * END OF - SUBCOMPONENTS REGISTERED BY THE DECORATORS
     */

    /*
     * KEYBOARD HANDLING
     */

    ModelEditorView.prototype._onBackgroundKeyDown = function (event) {
        var handled = false;
        switch (event.which) {
        case 46:    //DEL
            if (this._selectedComponentIds.length > 0) {
                this.onDelete(this._selectedComponentIds);
            }
            handled = true;
            break;
        case 65:    //a
            if (event.ctrlKey) {
                this._selectAll();
                handled = true;
            }
            break;
        case 67:    //c
            if (event.ctrlKey) {
                this.onCopy(this._selectedComponentIds);
                handled = true;
            }
            break;
        case 86:    //v
            if (event.ctrlKey) {
                this.onPaste();
                handled = true;
            }
            break;
        }

        if (handled === true) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    };

    /*
     * END OF - KEYBOARD HANDLING
     */

    ModelEditorView.prototype.saveConnectionSegmentPoints = function (connId, segmentPointsToSave) {
        this.onSaveConnectionSegmentPoints(connId, segmentPointsToSave);
    };

    ModelEditorView.prototype.setLineType = function (connId, type) {
        this.onSetLineType(connId, type);
    };


    /* PUBLIC API TO OVERRIDE*/
    ModelEditorView.prototype.onCreateConnection = function (connDesc) {
        this._logger.warning("onCreateConnection is not overridden in Controller...[sourceId: '" + connDesc.sourceId + "', targetId: '" + connDesc.targetId + "']");
    };

    ModelEditorView.prototype.onCopy = function (idList) {
        this._logger.warning("onCopy is not overridden in Controller..." + idList);
    };

    ModelEditorView.prototype.onPaste = function () {
        this._logger.warning("onPaste is not overridden in Controller...");
    };

    ModelEditorView.prototype.onDragCopy = function (pasteDesc) {
        this._logger.warning("onDragCopy is not overridden in Controller..." + pasteDesc);
    };

    ModelEditorView.prototype.onReposition = function (repositionDesc) {
        this._logger.warning("onReposition is not overridden in Controller..." + repositionDesc);
    };

    ModelEditorView.prototype.onUpdateConnectionEnd = function (data) {
        this._logger.warning("onUpdateConnectionEnd is not overridden in Controller..." + JSON.stringify(data));
    };

    ModelEditorView.prototype.onDelete = function (ids) {
        this._logger.warning("onDelete is not overridden in Controller..." + ids);
    };

    ModelEditorView.prototype.onSaveConnectionSegmentPoints = function (connId, segmentPointsToSave) {
        this._logger.warning("onSaveConnectionSegmentPoints is not overridden in Controller...connection: '" + connId + "', segmentpoints: " + JSON.stringify(segmentPointsToSave));
    };

    ModelEditorView.prototype.onSetLineType = function (connId, type) {
        this._logger.warning("onSetLineType is not overridden in Controller...connId: '" + connId + "', new type: '" + type + "'");
    };
    /*ENDOF -  PUBLIC API TO OVERRIDE*/

    return ModelEditorView;
});
