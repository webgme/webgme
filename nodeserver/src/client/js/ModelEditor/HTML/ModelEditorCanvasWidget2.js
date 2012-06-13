"use strict";

define(['./../../../../common/LogManager.js',
    './../../../../common/EventDispatcher.js',
    './../../util.js',
    './WidgetBase2.js',
    './ModelEditorModelWidget2.js',
    './ModelEditorConnectionWidget2.js',
    './../../NotificationManager.js',
    'raphael.amd'], function (logManager,
                                              EventDispatcher,
                                              util,
                                              WidgetBase,
                                              ModelEditorModelWidget2,
                                              ModelEditorConnectionWidget2,
                                              notificationManager) {
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
            getConnectionPortsForConnectionEnd;

        $.extend(this, new WidgetBase(id, proj));

        //disable any kind of selection on the control because of dragging
        this.el.disableSelection();

        initialize = function () {
            var newPattern,
                node = self.project.getNode(self.getId());

            //get logger instance for this component
            logger = logManager.create("ModelEditorCanvasWidget2_" + id);
            logManager.setLogLevel(5);

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
                "id" : id + "_children"
            });
            self.skinParts.childrenContainer.css("position", "absolute");
            self.skinParts.childrenContainer.outerWidth(defaultSize.w).outerHeight(defaultSize.h);
            self.el.append(self.skinParts.childrenContainer);
            self.skinParts.childrenContainer.bind("mousemove", function (event) {
                var myOffset = self.skinParts.childrenContainer.offset(),
                    mX = event.pageX - myOffset.left,
                    mY = event.pageY - myOffset.top;

                if (connectionInDraw.source) {
                    self.drawConnectionTo({"x": mX, "y": mY});
                }
            });

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

        this.addedToParent = function () {
            var i,
                connectionIds = [],
                childObject;

            //initialize Raphael paper from children container and set it to be full size of the HTML container
            self.skinParts.svgPaper = Raphael(self.skinParts.childrenContainer.attr("id"));
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
                logger.debug("onEvent CREATE: " + eid + " NOT YET IMPLEMENTED");
                break;
            case "delete":
                logger.debug("onEvent DELETE: " + eid + " NOT YET IMPLEMENTED");
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
            var i;
            for (i in self.children) {
                if (self.children.hasOwnProperty(i)) {
                    if ($.isFunction(self.children[i].highlightConnectionTarget)) {
                        self.children[i].highlightConnectionTarget.call(self.children[i], srcId);
                    }
                }
            }
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

        initialize();
    };

    return ModelEditorCanvasWidget2;
});