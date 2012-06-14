"use strict";

define(['logManager',
        'clientUtil',
        'commonUtil',
        'notificationManager',
        'raphaeljs',
        './WidgetBase2.js',
        './ModelEditorModelWidget2.js',
        './ModelEditorConnectionWidget2.js'
        ], function (logManager,
                      util,
                      commonUtil,
                      notificationManager,
                      raphaeljs,
                      WidgetBase,
                      ModelEditorModelWidget2,
                      ModelEditorConnectionWidget2) {

    var ModelEditorCanvasWidget2;

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorCanvasWidget.css');

    ModelEditorCanvasWidget2 = function (id, proj) {
        var logger,
            self = this,
            currentNodeInfo = { "id": id, "children" : [] },
            defaultSize = { "w": 800, "h": 1000 },
            myGridSize = 10,
            skinContent = {},
            initialize,
            createChildComponent,
            positionChildOnCanvas,
            adjustChildrenContainerSize,
            redrawConnection,
            redrawComponentConnections,
            getShortestConnectionPoints,
            selfId,
            selfPatterns = {},
            refresh,
            connectionInDraw = {},
            getConnectionPortsForConnectionEnd,
            onBackgroundMouseDown,
            onBackgroundMouseUp,
            onBackgroundMouseMove,
            getMousePos,
            dragStartPos = { "x": 0, "y": 0},
            selectionBBox = { "x": 0, "y": 0, "x2": 0, "y2": 0 },
            rubberBand = { "isDrawing": false,
                            "bBox": { "x": 0, "y": 0, "x2": 0, "y2": 0 } },
            clearSelection,
            selectedComponentIds = [],
            drawRubberBand,
            selectChildrenByRubberBand,
            setSelection,
            onBackgroundKeyDown,
            selectAll,
            onComponentMouseDown,
            lastDelta = {},
            deleteSelected,
            focusWidget;

        $.extend(this, new WidgetBase(id, proj));

        //disable any kind of selection on the control because of dragging
        this.el.disableSelection();

        initialize = function () {
            var node = self.project.getNode(self.getId());

            //get logger instance for this component
            logger = logManager.create("ModelEditorCanvasWidget2_" + id);

            selfId = self.project.addUI(self);
            currentNodeInfo.children = node.getChildrenIds();

            //generate skin controls
            //node title
            self.skinParts.title = $('<div/>');
            self.skinParts.title.addClass("modelEditorCanvasTitle");
            self.el.append(self.skinParts.title);

            //children container
            self.skinParts.childrenContainer = $('<div/>', {
                "class" : "children",
                "id" : id + "_children",
                "tabindex": 0
            });
            self.skinParts.childrenContainer.css("position", "absolute");
            self.skinParts.childrenContainer.outerWidth(defaultSize.w).outerHeight(defaultSize.h);
            self.el.append(self.skinParts.childrenContainer);
            self.skinParts.childrenContainer.disableSelection();

            self.skinParts.childrenContainer.bind('mousedown', onBackgroundMouseDown);
            self.skinParts.childrenContainer.bind('mouseup', onBackgroundMouseUp);
            self.skinParts.childrenContainer.bind('mousemove', onBackgroundMouseMove);
            self.skinParts.childrenContainer.bind('keydown', onBackgroundKeyDown);

            self.skinParts.dragPosPanel = $('<div/>', {
                "class" : "dragPosPanel"
            });
            self.skinParts.childrenContainer.append(self.skinParts.dragPosPanel);

            self.skinParts.rubberBand = $('<div/>', {
                "class" : "rubberBand"
            });
            self.skinParts.childrenContainer.append(self.skinParts.rubberBand);
            self.skinParts.rubberBand.hide();

            //get content from node
            skinContent.title = node.getAttribute(self.nodeAttrNames.name);

            //apply content to controls
            self.skinParts.title.html(skinContent.title);

            //specify territory
            selfPatterns[self.getId()] = { "children": 1};
            self.project.updateTerritory(selfId, selfPatterns);
        };

        focusWidget = function () {
            var x = self.el.parent().parent().scrollLeft(),
                y = self.el.parent().parent().scrollTop();
            self.skinParts.childrenContainer.focus();
            self.el.parent().parent().scrollLeft(x).scrollTop(y);
        };

        this.addedToParent = function () {
            var i,
                connectionIds = [],
                childObject;

            //initialize Raphael paper from children container and set it to be full size of the HTML container
            self.skinParts.svgPaper = Raphael(self.skinParts.childrenContainer.attr("id"));
            self.skinParts.svgPaper.canvas.style.pointerEvents = "none";
            self.skinParts.svgPaper.setSize("100%", "100%");

            //create connection line instance
            connectionInDraw.path = self.skinParts.svgPaper.path("M0,0").attr({"stroke-width": 2,
                            "stroke": "#FF7800", "stroke-dasharray": "-"}).hide();

            //create widget for children and add them to self
            //first draw the models and after that the connections
            for (i = 0; i < currentNodeInfo.children.length; i += 1) {
                childObject = self.project.getNode(currentNodeInfo.children[i]);
                if (childObject) {
                    if (childObject.getBaseId() === "connection") {
                        connectionIds.push(currentNodeInfo.children[i]);
                    } else {
                        createChildComponent(currentNodeInfo.children[i]);
                    }
                }
            }

            //we need the timeout for the CSS rules to be applied (the object needs its final size before we can draw connections)
            setTimeout(function () {
                for (i = 0; i < connectionIds.length; i += 1) {
                    createChildComponent(connectionIds[i]);
                }
            }, 100);
        };

        createChildComponent = function (childId) {
            var childNode = self.project.getNode(childId),
                childWidget;

            if (childNode) {
                if (childNode.getBaseId() === "connection") {
                    childWidget = new ModelEditorConnectionWidget2(childId, self.project, self.skinParts.svgPaper);
                } else {
                    childWidget = new ModelEditorModelWidget2(childId, self.project);
                }

                if (childWidget) {
                    self.addChild(childWidget);
                }
            }
        };

        this.childBBoxChanged = function (childComponent) {
            //check children's X;Y position based on this parent's layout settings
            positionChildOnCanvas(childComponent);

            //readjust if necessary
            redrawComponentConnections(childComponent.getId());

            //check if current children container's width and height are big enough to contain the children
            adjustChildrenContainerSize(childComponent);
        };

        this.childAdded = function (childComponent) {
            var childComponentEl = $(childComponent.el),
                childNode = self.project.getNode(childComponent.getId());

            //hook up selection
            if (childComponent.isSelectable() === true) {
                childComponentEl.bind('mousedown', onComponentMouseDown);
            }

            //hook up moving
            if (childComponent.isDraggable() === true) {
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

                        logger.debug("draggable_start: " + childComponentEl.attr("id"));

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

                        self.skinParts.dragPosPanel.html("X: " + selectionBBox.x + " Y: " + selectionBBox.y);
                        self.skinParts.dragPosPanel.css("left", selectionBBox.x + (selectionBBox.w - self.skinParts.dragPosPanel.outerWidth()) / 2);
                        self.skinParts.dragPosPanel.css("top", selectionBBox.y + selectionBBox.h + 10);
                        self.skinParts.dragPosPanel.show();
                        logger.debug("Start dragging from original position X: " + childComponent.dragStartPos.x + ", Y: " + childComponent.dragStartPos.y);

                        //event.stopPropagation();
                    },
                    stop: function (event, ui) {
                        var stopPos = { "x": parseInt(ui.helper.css("left"), 10), "y": parseInt(ui.helper.css("top"), 10) },
                            dX = stopPos.x - dragStartPos.x,
                            dY = stopPos.y - dragStartPos.y,
                            i,
                            childId;

                        logger.debug("Stop dragging at position X: " + stopPos.x + ", Y: " + stopPos.y);
                        self.skinParts.dragPosPanel.hide();

                        //save back new position
                        //TODO: FIXME - do all the save in one round!!!!
                        for (i = 0; i < selectedComponentIds.length; i += 1) {
                            childId = selectedComponentIds[i];
                            redrawComponentConnections(childId);
                            self.children[childId].setPosition(self.children[childId].dragStartPos.x + dX, self.children[childId].dragStartPos.y + dY, false);
                        }

                    },
                    drag: function (event, ui) {
                        var dragPos = { "x": parseInt(ui.helper.css("left"), 10), "y": parseInt(ui.helper.css("top"), 10) },
                            dX = dragPos.x - dragStartPos.x,
                            dY = dragPos.y - dragStartPos.y,
                            i,
                            childId,
                            connectionsToRedraw = [];

                        if ((dX !== lastDelta.x) || (dY !== lastDelta.y)) {
                            //position drag-position panel
                            self.skinParts.dragPosPanel.html("X: " + (selectionBBox.x + dX) + " Y: " + (selectionBBox.y + dY));
                            self.skinParts.dragPosPanel.css("left", selectionBBox.x + dX + (selectionBBox.w - self.skinParts.dragPosPanel.outerWidth()) / 2);
                            self.skinParts.dragPosPanel.css("top", selectionBBox.y + dY + selectionBBox.h + 10);

                            //move all the selected children
                            for (i = 0; i < selectedComponentIds.length; i += 1) {
                                childId = selectedComponentIds[i];
                                self.children[childId].el.css("left", self.children[childId].dragStartPos.x + dX);
                                self.children[childId].el.css("top", self.children[childId].dragStartPos.y + dY);

                                connectionsToRedraw = commonUtil.mergeArrays(connectionsToRedraw, self.children[childId].getConnections(true));
                            }

                            for (i = 0; i < connectionsToRedraw.length; i += 1) {
                                redrawConnection(connectionsToRedraw[i]);
                            }

                            lastDelta = {"x": dX, "y": dY};
                        }
                    }
                });
            }

            if (childComponent instanceof ModelEditorConnectionWidget2) {
                redrawConnection(childComponent.getId());
            }
        };

        this.onDestroy = function () {
            self.project.updateTerritory(selfId, []);
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
                childComponent.setPosition(pX, pY, true, true);
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

        redrawConnection = function (childId) {
            var childComponent = self.children[childId],
                childNode = self.project.getNode(childId),
                srcId,
                trgtId,
                srcConnectionPoints,
                trgtConnectionPoints,
                shortestConnPoint,
                sideDescriptor = [];



            if (childComponent && childNode) {
                srcId = childNode.getPointer("source").to;
                trgtId =  childNode.getPointer("target").to;

                srcConnectionPoints = getConnectionPortsForConnectionEnd(srcId);
                trgtConnectionPoints = getConnectionPortsForConnectionEnd(trgtId);

                shortestConnPoint = getShortestConnectionPoints(srcConnectionPoints, trgtConnectionPoints);
                if (shortestConnPoint.length > 0) {
                    logger.debug("Shortest for '" + childId + "' are: " + shortestConnPoint[0] + " --> " + shortestConnPoint[1]);

                    if (shortestConnPoint.length === 2) {
                        if (shortestConnPoint[0] === "N") { sideDescriptor.push(0); }
                        if (shortestConnPoint[0] === "S") { sideDescriptor.push(1); }
                        if (shortestConnPoint[0] === "W") { sideDescriptor.push(2); }
                        if (shortestConnPoint[0] === "E") { sideDescriptor.push(3); }
                        if (shortestConnPoint[0] === "O") { sideDescriptor.push(3); }

                        if (shortestConnPoint[1] === "N") { sideDescriptor.push(0); }
                        if (shortestConnPoint[1] === "S") { sideDescriptor.push(1); }
                        if (shortestConnPoint[1] === "W") { sideDescriptor.push(2); }
                        if (shortestConnPoint[1] === "E") { sideDescriptor.push(3); }
                        if (shortestConnPoint[1] === "O") { sideDescriptor.push(3); }

                        /*modelConnectionRegistry[srcId] = modelConnectionRegistry[srcId] || {};
                         modelConnectionRegistry[srcId][shortestConnPoint[0]] = modelConnectionRegistry[srcId][shortestConnPoint[0]] || [];
                         modelConnectionRegistry[srcId][shortestConnPoint[0]].push(childComponent.getId());*/

                        childComponent.setCoordinates(srcConnectionPoints[shortestConnPoint[0]], trgtConnectionPoints[shortestConnPoint[1]], sideDescriptor);
                    }
                }
            }
        };

        getConnectionPortsForConnectionEnd = function (cEndId) {
            var widget,
                grandChildNode,
                connectionPoints = [];

            //get source and target widget of the connection
            if (cEndId !== null) {
                //when the source is a concrete child model
                if (self.children[cEndId]) {
                    widget = self.children[cEndId];
                    connectionPoints = widget.getConnectionPoints();
                } else {
                    //the end might be a grandchild level port in one of the children
                    grandChildNode = self.project.getNode(cEndId);
                    if (grandChildNode) {
                        widget = self.children[grandChildNode.getParentId()];
                        connectionPoints = widget.getConnectionPointsForPort(cEndId);
                    }
                }
            }

            return connectionPoints;
        };

        redrawComponentConnections = function (childId) {
            var connectionsToRedraw = [],
                i;

            //get the model's ports' incoming and outgoing connections
            if (self.children[childId]) {
                connectionsToRedraw = self.children[childId].getConnections(true);

                for (i = 0; i < connectionsToRedraw.length; i += 1) {
                    redrawConnection(connectionsToRedraw[i]);
                }
            }
        };

        //figure out the shortest side to choose between the two
        getShortestConnectionPoints = function (srcConnectionPoints, trgtConnectionPoints) {
            var d = {},
                dis = [],
                i,
                j,
                dx,
                dy,
                result = [];

            for (i in srcConnectionPoints) {
                if (srcConnectionPoints.hasOwnProperty(i)) {
                    for (j in trgtConnectionPoints) {
                        if (trgtConnectionPoints.hasOwnProperty(j)) {
                            dx = Math.abs(srcConnectionPoints[i].x - trgtConnectionPoints[j].x);
                            dy = Math.abs(srcConnectionPoints[i].y - trgtConnectionPoints[j].y);

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

        // PUBLIC METHODS
        this.onEvent = function (etype, eid) {
            logger.debug("onEvent '" + etype + "', '" + eid + "'");
            switch (etype) {
            case "load":
                //createChildComponent(eid, true);
                //refresh("insert", eid);
                break;
            case "update":
                if (eid === currentNodeInfo.id) {
                    refresh("update", eid);
                }
                break;
            case "create":
                //logger.debug("onEvent CREATE: " + eid + " NOT YET IMPLEMENTED");
                break;
            case "delete":
                //logger.debug("onEvent DELETE: " + eid + " NOT YET IMPLEMENTED");
                break;
            }
        };

        this.createConnection = function (sourceId, targetId) {
            logger.debug("createConnection from '" + sourceId + "' to '" + targetId + "'");
            self.project.makeConnection({   "parentId": currentNodeInfo.id,
                                            "sourceId": sourceId,
                                            "targetId": targetId,
                                            "directed": true });
        };

        refresh = function (eventType, objectId) {
            var j,
                oldChildren,
                currentChildren,
                childrenDeleted,
                childrenAdded,
                updatedObject;

            //HANDLE UPDATE
            //object got updated in the territory
            if (eventType === "update") {
                updatedObject = self.project.getNode(objectId);

                //check if the updated object is the opened node
                if (objectId === currentNodeInfo.id) {
                    //the updated object is the parent whose children are displayed here
                    //the interest about the parent is:
                    // - name change
                    // - new children
                    // - deleted children

                    //handle name change
                    //get content from node
                    skinContent.title = updatedObject.getAttribute(self.nodeAttrNames.name);

                    //apply content to controls
                    self.skinParts.title.html(skinContent.title);

                    //save old and current children info to be able to see the difference
                    oldChildren = currentNodeInfo.children;
                    currentChildren = updatedObject.getChildrenIds() || [];

                    //Handle children deletion
                    childrenDeleted = util.arrayMinus(oldChildren, currentChildren);

                    for (j = 0; j < childrenDeleted.length; j += 1) {
                        self.removeChildById(childrenDeleted[j]);
                    }

                    //Handle children addition
                    childrenAdded = util.arrayMinus(currentChildren, oldChildren);
                    for (j = 0; j < childrenAdded.length; j += 1) {
                        createChildComponent(childrenAdded[j]);
                    }

                    //finally store the actual children info for the parent
                    currentNodeInfo.children = currentChildren;

                }
            }
            //END IF : HANDLE UPDATE
        };

        this.startDrawConnection = function (srcId) {
            /*var i;
            for (i in self.children) {
                if (self.children.hasOwnProperty(i)) {
                    if ($.isFunction(self.children[i].highlightConnectionTarget)) {
                        self.children[i].highlightConnectionTarget.call(self.children[i], srcId);
                    }
                }
            }*/
            connectionInDraw.source = srcId;
            connectionInDraw.path.show();
        };

        this.drawConnectionTo = function (toPosition) {
            var srcConnectionPoints = getConnectionPortsForConnectionEnd(connectionInDraw.source),
                closestConnectionPoints = getShortestConnectionPoints(srcConnectionPoints, { "X" : toPosition }),
                pathDefinition = "M" + srcConnectionPoints[closestConnectionPoints[0]].x + "," + srcConnectionPoints[closestConnectionPoints[0]].y + "L" + toPosition.x + "," + toPosition.y;

            connectionInDraw.path.attr({ "path": pathDefinition});

        };

        this.endDrawConnection = function () {
            delete connectionInDraw.source;
            connectionInDraw.path.attr({"path": "M0,0"}).hide();
        };

        getMousePos = function (e) {
            var childrenContainerOffset = self.skinParts.childrenContainer.offset();
            return { "mX": e.pageX - childrenContainerOffset.left,
                     "mY": e.pageY - childrenContainerOffset.top };
        };

        onBackgroundMouseDown = function (e) {
            var mousePos = getMousePos(e),
                target = e.target || e.currentTarget;

            logger.debug("onBackgroundMouseDown: " + $(target).attr("id"));

            if (e.ctrlKey !== true) {
                clearSelection();
            }

            //start drawing rubberband
            rubberBand.isDrawing = true;
            rubberBand.bBox = { "x": mousePos.mX, "y": mousePos.mY, "x2": mousePos.mX, "y2": mousePos.mY };
            drawRubberBand();
        };

        onBackgroundMouseMove = function (e) {
            var mousePos = getMousePos(e);

            if (connectionInDraw.source) {
                self.drawConnectionTo({"x": mousePos.mX, "y": mousePos.mY});
            } else if (rubberBand.isDrawing) {
                rubberBand.bBox.x2 = mousePos.mX;
                rubberBand.bBox.y2 = mousePos.mY;
                drawRubberBand();
            }
        };

        onBackgroundMouseUp = function (e) {
            var mousePos = getMousePos(e);

            if (rubberBand.isDrawing === true) {
                rubberBand.bBox.x2 = mousePos.mX;
                rubberBand.bBox.y2 = mousePos.mY;
                drawRubberBand();
                selectChildrenByRubberBand(e.ctrlKey);
                self.skinParts.rubberBand.hide();

                rubberBand.isDrawing = false;
            }
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

        drawRubberBand = function () {
            var minEdgeLength = 2,
                tX = Math.min(rubberBand.bBox.x, rubberBand.bBox.x2),
                tX2 = Math.max(rubberBand.bBox.x, rubberBand.bBox.x2),
                tY = Math.min(rubberBand.bBox.y, rubberBand.bBox.y2),
                tY2 = Math.max(rubberBand.bBox.y, rubberBand.bBox.y2);

            if (tX2 - tX < minEdgeLength || tY2 - tY < minEdgeLength) {
                self.skinParts.rubberBand.hide();
            } else {
                self.skinParts.rubberBand.show();
            }

            self.skinParts.rubberBand.css("left", tX);
            self.skinParts.rubberBand.css("top", tY);
            self.skinParts.rubberBand.outerWidth(tX2 - tX);
            self.skinParts.rubberBand.outerHeight(tY2 - tY);
        };

        selectChildrenByRubberBand = function (ctrlPressed) {
            var i,
                rbBBox = {  "x":  Math.min(rubberBand.bBox.x, rubberBand.bBox.x2),
                            "y": Math.min(rubberBand.bBox.y, rubberBand.bBox.y2),
                            "x2": Math.max(rubberBand.bBox.x, rubberBand.bBox.x2),
                            "y2": Math.max(rubberBand.bBox.y, rubberBand.bBox.y2) },
                childrenIDs = [],
                selectionContainsBBox;

            logger.debug("Select children by rubber band: [" + rbBBox.x + "," + rbBBox.y + "], [" + rbBBox.x2 + "," + rbBBox.y2 + "]");

            selectionContainsBBox = function (childBBox, childId) {
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

            for (i in self.children) {
                if (self.children.hasOwnProperty(i)) {
                    if (self.children[i].isSelectable() === true) {
                        if (selectionContainsBBox(self.children[i].getBoundingBox(), i)) {
                            childrenIDs.push(i);
                        }
                    }
                }
            }

            if (childrenIDs.length > 0) {
                setSelection(childrenIDs, ctrlPressed);
            }
        };

        onComponentMouseDown = function (e) {
            var id = $(e.currentTarget).attr('id');
            logger.debug("onComponentMouseDown: " + id);

            setSelection([id], e.ctrlKey);

            focusWidget();

            e.stopPropagation();
        };

        setSelection = function (ids, ctrlPressed) {
            var i,
                childId,
                childComponent;

            if (ids.length > 0) {
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

                            if (childComponent) {
                                childComponent.el.addClass("selectedModel");
                            }

                            if ($.isFunction(childComponent.onSelect)) {
                                childComponent.onSelect.call(childComponent);
                            }
                        }
                    }
                }
            }

            logger.debug("selectedids: " + selectedComponentIds);
        };

        onBackgroundKeyDown = function (e) {
            switch (e.which) {
            case 65:    //a
                if (e.ctrlKey) {
                    selectAll();
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                break;
            case 67:    //c
                if (e.ctrlKey) {
                    if ($.isFunction(self.onNodeCopy)) {
                        self.onNodeCopy.call(self, selectedComponentIds);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                break;
            case 86:    //v
                if (e.ctrlKey) {
                    if ($.isFunction(self.onNodePaste)) {
                        self.onNodePaste.call(self);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                break;
            case 46:    //DEL
                deleteSelected();
                e.preventDefault();
                e.stopPropagation();
                return false;
                break;
            }
        };

        selectAll = function () {
            var childrenIDs = [],
                i;

            for (i in self.children) {
                if (self.children.hasOwnProperty(i)) {
                    if (self.children[i].isSelectable() === true) {
                        childrenIDs.push(i);
                    }
                }
            }

            if (childrenIDs.length > 0) {
                setSelection(childrenIDs, false);
            }
        };

        deleteSelected = function () {
            var i,
                selected = selectedComponentIds;

            for (i = 0; i < selected.length; i += 1) {
                self.project.deleteNode(selected[i]);
            }
        };

        this.removeFromSelected = function (id) {
            if (selectedComponentIds.indexOf(id) !== -1) {
                setSelection([id], true);
            }
        };

        initialize();
    };

    return ModelEditorCanvasWidget2;
});