/*
 * WIDGET ModelEditor based on SVG
 */
define([    'clientUtil',
            'logManager',
            'commonUtil',
            'notificationManager',
            'raphaeljs',
            'lib/jquery/jwerty',
            './ModelEditorSVGModel.js',
            './ModelEditorSVGConnection.js'
        ], function (util,
                       logManager,
                       commonUtil,
                       notificationManager,
                       raphaeljs,
                       _jwerty,
                       ModelEditorSVGModel,
                       ModelEditorSVGConnection) {
    "use strict";

    var ModelEditorSVGWidget;
    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorSVGWidget.css');

    ModelEditorSVGWidget = function (containerId) {
        var logger,
            containerControl,
            guid,
            paper,
            zoomFactor = 1.0,
            self = this,
            dragStart,
            dragEnd,
            dragMove,
            modelEditorE,
            titleText,
            resizeSVG,
            paperCanvas,
            defaultPaperSize = { "w" : 2000, "h": 1500 },
            setSelection,
            selectedComponentIds = [],
            clearSelection,
            children = {},
            onBackgroundMouseDown,
            onBackgroundMouseUp,
            onBackgroundMouseMove,
            rubberBandBBox,
            drawRubberBand,
            rubberBandDrawing = false,
            selectChildrenByRubberBand,
            rubberBandRect = null,
            onBackgroundKeyDown,
            selectAll,
            connectionDrawingDescriptor = { "isDrawing" : false },
            drawConnection,
            activeModelId = null;

        //get logger instance for this component
        logger = logManager.create("ModelEditorSVGWidget");

        //save jQueried parent control
        //save jQueried parent control
        containerControl = $("#" + containerId);

        if (containerControl.length === 0) {
            logger.error("ModelEditorSVGWidget's container control with id:'" + containerId + "' could not be found");
            return undefined;
        }

        //clear container content
        containerControl.html("");

        //generate unique id for control
        guid = commonUtil.guid();

        //generate control dynamically
        modelEditorE = $('<div/>', {
            id: "modelEditor_" + guid,
            "class": "modelEditorSVG",
            "tabindex": 0
        });

        //add control to parent
        containerControl.append(modelEditorE);

        //create Raphael paper
        paper = Raphael(modelEditorE.attr("id"), defaultPaperSize.w, defaultPaperSize.h);

        paperCanvas = $(paper.canvas);

        dragStart = function () {
            var i,
                childComponent;

            for (i = 0; i < selectedComponentIds.length; i += 1) {
                childComponent = children[selectedComponentIds[i]];
                childComponent.dragStartPos = childComponent.getPosition();
            }
        };

        dragEnd = function () {
            var i,
                childComponent;

            for (i = 0; i < selectedComponentIds.length; i += 1) {
                childComponent = children[selectedComponentIds[i]];

                resizeSVG(childComponent.getBoundingBox(), true);

                delete childComponent.dragStartPos;

                if ($.isFunction(self.onObjectPositionChanged)) {
                    self.onObjectPositionChanged.call(self, childComponent.getId(), childComponent.getPosition());
                }
            }
        };
        dragMove = function (dx, dy) {
            var i,
                childComponent;
            for (i = 0; i < selectedComponentIds.length; i += 1) {
                childComponent = children[selectedComponentIds[i]];
                childComponent.updateComponent({ "posX": Math.round(childComponent.dragStartPos.posX + dx * zoomFactor), "posY": Math.round(childComponent.dragStartPos.posY + dy * zoomFactor) }, false);
            }
        };

        resizeSVG = function (bBox, doScroll) {
            var needResize = false,
                cW = paperCanvas.outerWidth(),
                cH = paperCanvas.outerHeight();

            if (cW < (bBox.x + bBox.width) * zoomFactor) {
                cW = bBox.x + bBox.width + 100;
                needResize = true;
            }

            if (cH < (bBox.y + bBox.height) * zoomFactor) {
                cH =  bBox.y + bBox.height + 100;
                needResize = true;
            }

            if (needResize === true) {
                logger.debug("Resizing canvas to the size: " + cW + ", " + cH);
                paper.setSize(cW, cH);
                if (doScroll === true) {
                    $("#middlePane").prop("scrollTop", $("#middlePane").prop("scrollHeight") - $("#middlePane").height());
                }
            }
        };

        /* PUBLIC FUNCTIONS */
        this.clear = function () {
            var i;
            paper.clear();
            paper.setSize(defaultPaperSize.w, defaultPaperSize.h);
            titleText = null;

            for (i in children) {
                if (children.hasOwnProperty(i)) {
                    children[i].deleteComponent();
                    delete children[i];
                }
            }
        };

        this.setTitle = function (title) {
            var oldTitle = "";

            if (titleText) {
                oldTitle = titleText.attr("text");
                if (oldTitle !== title) {
                    titleText.attr({ "text": title,
                                      "opacity": 0.0 });
                    titleText.animate({ "opacity": 1.0 }, 400);
                    notificationManager.displayMessage("Node name '" + oldTitle + "' has been changed to '" + title + "'.");
                }
            } else {
                titleText = paper.text(5, 15, title);
                titleText.attr("text-anchor", "start");
                titleText.attr("font-size", 16);
                titleText.attr("font-weight", "bold");
            }
        };

        this.createObject = function (objDescriptor) {
            var newComponent, draggableComponents, i, hookUpDrag, hookUpSelection, self = this;

            logger.debug("Creating object with parameters: " + JSON.stringify(objDescriptor));

            if (objDescriptor.kind === "MODEL") {
                newComponent = new ModelEditorSVGModel(objDescriptor, paper, self);
            }

            if (objDescriptor.kind === "CONNECTION") {
                newComponent = new ModelEditorSVGConnection(objDescriptor, paper);
            }

            if (newComponent) {
                resizeSVG(newComponent.getBoundingBox(), false);

                draggableComponents = newComponent.getDraggableComponents();

                if (newComponent.isSelectable() === true) {
                    hookUpSelection = function (svgObject, component) {
                        svgObject.mousedown(function (e) {
                            setSelection.call(self, [component.getId()], e.ctrlKey);
                            //e.preventDefault();
                            //e.stopPropagation();
                        });
                    };

                    for (i = 0; i < draggableComponents.length; i += 1) {
                        hookUpSelection(draggableComponents[i], newComponent);
                    }
                }

                if (newComponent.isDraggable() === true) {
                    hookUpDrag = function (svgObject) {
                        svgObject.node.style.cursor = 'move';
                        svgObject.drag(dragMove, dragStart, dragEnd);
                    };

                    for (i = 0; i < draggableComponents.length; i += 1) {
                        hookUpDrag(draggableComponents[i]);
                    }
                }

                children[newComponent.getId()] = newComponent;
            }

            return newComponent;
        };

        this.updateObject = function (modelObject, objDescriptor) {
            logger.debug("Updating object with parameters: " + JSON.stringify(objDescriptor));

            modelObject.updateComponent(objDescriptor);

            resizeSVG(modelObject.getBoundingBox(), false);
        };

        this.deleteObject = function (modelObject) {
            logger.debug("Deleting object with parameters: " + modelObject);
            delete children[modelObject.getId()];
            modelObject.deleteComponent();
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
                        childComponent = children[childId];

                        if (selectedComponentIds.indexOf(childId) === -1) {
                            selectedComponentIds.push(childId);

                            if ($.isFunction(childComponent.onSelect)) {
                                childComponent.onSelect.call(childComponent);
                            }
                        } else {
                            //child is already part of the selection
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
                            childComponent = children[childId];

                            selectedComponentIds.push(childId);

                            if ($.isFunction(childComponent.onSelect)) {
                                childComponent.onSelect.call(childComponent);
                            }
                        }
                    } else {
                        childId = ids[0];
                        childComponent = children[childId];

                        //if not yet in selection
                        if (selectedComponentIds.indexOf(childId) === -1) {
                            clearSelection();

                            selectedComponentIds.push(childId);

                            if ($.isFunction(childComponent.onSelect)) {
                                childComponent.onSelect.call(childComponent);
                            }
                        }
                    }
                }
            }

            logger.debug("selectedIds: " + selectedComponentIds);
        };

        clearSelection = function () {
            var i,
                childId,
                childComponent;

            for (i = 0; i < selectedComponentIds.length; i += 1) {
                childId = selectedComponentIds[i];
                childComponent = children[childId];

                if (childComponent) {
                    if ($.isFunction(childComponent.onDeselect)) {
                        childComponent.onDeselect.call(childComponent);
                    }

                }
            }

            selectedComponentIds = [];
        };

        onBackgroundMouseDown = function (e) {
            var target = e.target || e.currentTarget,
                mX,
                mY;

            if (target instanceof SVGSVGElement) {
                if (e.ctrlKey !== true) {
                    clearSelection();
                }

                //get fixed mouse coordinates
                mX = e.pageX - $(this).offset().left;
                mY = e.pageY - $(this).offset().top;

                //start drawing rubberband
                rubberBandDrawing = true;
                rubberBandBBox = { "x": mX, "y": mY, "x2": mX, "y2": mY };
                drawRubberBand();
            }
        };

        onBackgroundMouseMove = function (e) {
            var mX = e.pageX - $(this).offset().left,
                mY = e.pageY - $(this).offset().top;

            if (rubberBandDrawing) {
                rubberBandBBox.x2 = mX;
                rubberBandBBox.y2 = mY;
                drawRubberBand();
            }
            if (connectionDrawingDescriptor.isDrawing) {
                drawConnection(mX, mY);
            }
        };

        onBackgroundMouseUp = function (e) {
            if (rubberBandDrawing) {
                rubberBandBBox.x2 = e.pageX - $(this).offset().left;
                rubberBandBBox.y2 = e.pageY -  $(this).offset().top;
                drawRubberBand();

                selectChildrenByRubberBand(e.ctrlKey);

                rubberBandRect.remove();
                rubberBandRect = null;
            }
            rubberBandDrawing = false;

            if (connectionDrawingDescriptor.isDrawing) {
                self.endDrawConnection(activeModelId);
            }
        };

        drawRubberBand = function () {
            var minEdgeLength = 2,
                tX = Math.min(rubberBandBBox.x, rubberBandBBox.x2),
                tX2 = Math.max(rubberBandBBox.x, rubberBandBBox.x2),
                tY = Math.min(rubberBandBBox.y, rubberBandBBox.y2),
                tY2 = Math.max(rubberBandBBox.y, rubberBandBBox.y2);

            if (rubberBandRect === null) {
                rubberBandRect = paper.rect(0, 0, 100, 100).attr({"fill": "rgba(219, 234, 252, 0.49)", "stroke": "#52A8EC", "stroke-width": 1});
            }

            if (tX2 - tX < minEdgeLength || tY2 - tY < minEdgeLength) {
                rubberBandRect.hide();
            } else {
                rubberBandRect.show();
            }

            rubberBandRect.attr({   "x": tX,
                                    "y": tY,
                                    "width": tX2 - tX,
                                    "height": tY2 - tY });
        };

        selectChildrenByRubberBand = function (ctrlPressed) {
            var i,
                tX = Math.min(rubberBandBBox.x, rubberBandBBox.x2),
                tX2 = Math.max(rubberBandBBox.x, rubberBandBBox.x2),
                tY = Math.min(rubberBandBBox.y, rubberBandBBox.y2),
                tY2 = Math.max(rubberBandBBox.y, rubberBandBBox.y2),
                rbBBox = { "x": tX, "y": tY, "x2": tX2, "y2": tY2 },
                childrenIDs = [],
                selectionContainsBBox;

            logger.debug("Select children by rubber band: [" + tX + "," + tY + "], [" + tX2 + "," + tY2 + "]");

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

            for (i in children) {
                if (children.hasOwnProperty(i)) {
                    if (children[i].isSelectable() === true) {
                        if (selectionContainsBBox(children[i].getBoundingBox())) {
                            childrenIDs.push(i);
                        }
                    }
                }
            }

            if (childrenIDs.length > 0) {
                setSelection(childrenIDs, ctrlPressed);
            }
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
            }
        };

        selectAll = function () {
            var childrenIDs = [],
                i;

            for (i in children) {
                if (children.hasOwnProperty(i)) {
                    if (children[i].isSelectable() === true) {
                        childrenIDs.push(i);
                    }
                }
            }

            if (childrenIDs.length > 0) {
                setSelection(childrenIDs, false);
            }
        };

        //hook up background mouse events for rubberband box selection
        modelEditorE.bind('mousedown', onBackgroundMouseDown);
        modelEditorE.bind('mousemove', onBackgroundMouseMove);
        modelEditorE.bind('mouseup', onBackgroundMouseUp);
        modelEditorE.bind('keydown', onBackgroundKeyDown);

        this.startDrawConnection = function (sourceId) {
            var connDescriptor = {};

            if (connectionDrawingDescriptor.isDrawing === false) {
                connDescriptor.id = "tempConnection";
                connDescriptor.directed = true;
                connDescriptor.sourceComponent = children[sourceId];
                connDescriptor.targetComponent = null;
                //connDescriptor.color = "#0000FF";
                connDescriptor.markerAtEnds = false;

                connectionDrawingDescriptor.isDrawing = true;
                connectionDrawingDescriptor.sourceId = sourceId;
                connectionDrawingDescriptor.connection = new ModelEditorSVGConnection(connDescriptor, paper);

                logger.debug("startDrawConnection: " + sourceId);
            }
        };

        this.endDrawConnection = function (targetId) {
            if (connectionDrawingDescriptor.isDrawing === true) {
                if (targetId) {
                    connectionDrawingDescriptor.targetId = targetId;
                    logger.debug("endDrawConnection: " + targetId);
                    if ($.isFunction(self.onConnectionCreated)) {
                        self.onConnectionCreated.call(self, connectionDrawingDescriptor.sourceId, connectionDrawingDescriptor.targetId);
                    }
                }

                //finally clean up the temporary drawing
                connectionDrawingDescriptor.connection.deleteComponent();
                delete connectionDrawingDescriptor.connection;
                connectionDrawingDescriptor = { "isDrawing": false };
            }
        };

        drawConnection = function (mX, mY) {
            var connDesc = {};

            //when mouse is not over a model, draw line to the mouse pos
            if (activeModelId === null) {
                connDesc.targetComponent = {};
                connDesc.markerAtEnds = false;
                connDesc.targetComponent.getBoundingBox = function () {
                    return {
                        "x": mX,
                        "y": mY,
                        "x2": mX + 2,
                        "y2": mY + 2,
                        "width": 2,
                        "height": 2
                    };
                };
            } else {
                //draw line to the component the mouse is currently over
                connDesc.targetComponent = children[activeModelId];
                connDesc.markerAtEnds = true;
            }

            connectionDrawingDescriptor.connection.updateComponent(connDesc);
        };

        this.setActiveModel = function (id) {
            activeModelId = id;
        };

        this.resetActiveModel = function (id) {
            if (activeModelId === id) {
                activeModelId = null;
            }
        };
    };

    return ModelEditorSVGWidget;
});