"use strict";

define(['logManager',
        'js/Widgets/DiagramDesigner/DragScroll'], function (logManager,
                                                    DragScroll) {

    var ConnectionDrawingManager,
        EVENTPOSTFIX = 'ConnectionDrawingManager',
        MOUSEDOWN = 'mousedown.' + EVENTPOSTFIX,
        MOUSEUP = 'mouseup.' + EVENTPOSTFIX,
        MOUSEENTER = 'mouseenter.' + EVENTPOSTFIX,
        MOUSELEAVE = 'mouseleave.' + EVENTPOSTFIX,
        ACCEPT_CLASS = 'connection-source',
        HOVER_CLASS = 'connection-end-state-hover',
        IN_DRAW_COLOR = "#FF7800",
        IN_DRAW_LINETYPE = "-",
        DRAW_CONNECTION_DRAG_HELPER_CLASS = "draw-connection-drag-helper",
        DRAW_TYPE_CREATE = "create",
        DRAW_TYPE_RECONNECT = "reconnect";

    ConnectionDrawingManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "ConnectionDrawingManager"));

        this._diagramDesigner = options ? options.diagramDesigner : null;

        if (this._diagramDesigner === undefined || this._diagramDesigner === null) {
            this.logger.error("Trying to initialize a ConnectionDrawingManager without a diagramDesigner...");
            throw ("ConnectionDrawingManager can not be created");
        }

        this.logger.debug("ConnectionDrawingManager ctor finished");
    };

    ConnectionDrawingManager.prototype.initialize = function () {
        var self = this;

        this._paper = this._diagramDesigner.skinParts.SVGPaper;

        this._metaInfo = null;

        this._connectionInDraw = false;
        this._connectionPathProps = { "strokeWidth" : 2,
            "strokeColor" : IN_DRAW_COLOR,
            "lineType": IN_DRAW_LINETYPE,
            "arrowStart": "none",
            "arrowEnd": "none" };

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ITEM_POSITION_CHANGED, function (_canvas, event) {
            self._canvasItemPositionChanged(event);
        });

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ITEM_SUBCOMPONENT_POSITION_CHANGED, function (_canvas, event) {
            self._canvasItemPositionChanged(event);
        });

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ON_COMPONENT_DELETE, function (_canvas, componentId) {
            self._onComponentDelete(componentId);
        });

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ON_UNREGISTER_SUBCOMPONENT, function (_canvas, eventArgs) {
            self._onComponentDelete(eventArgs.objectID, eventArgs.subComponentID);
        });

        this._dragScroll = new DragScroll(this._diagramDesigner.skinParts.$diagramDesignerWidgetBody);
    };

    ConnectionDrawingManager.prototype.attachConnectable = function (elements, objId, sCompId) {
        if (this._connectionInDraw === true) {
            this._attachConnectionEndPointHandler(elements, objId, sCompId);
        } else {
            this._attachConnectionSourcePointHandler(elements, objId, sCompId);
        }
    };

    ConnectionDrawingManager.prototype.detachConnectable = function (elements) {
        if (this._connectionInDraw === true) {
            this._detachConnectionEndPointHandler(elements);
        } else {
            this._detachConnectionEndPointHandler(elements);
            this._detachConnectionSourcePointHandler(elements);
        }
    };

    ConnectionDrawingManager.prototype._detachConnectionSourcePointHandler = function (elements) {
        if (elements && elements.length > 0) {
            if (elements.hasClass('ui-draggable')) {
                elements.draggable('destroy');
            }
            elements.off(MOUSEDOWN);
        }
    };

    ConnectionDrawingManager.prototype._detachConnectionEndPointHandler = function (elements) {
        if (elements && elements.length > 0) {
            if (elements.hasClass('ui-droppable')) {
                elements.droppable('destroy');
            }
            elements.off(MOUSEENTER).off(MOUSELEAVE).off(MOUSEUP);
            elements.removeClass(HOVER_CLASS);
        }
    };

    ConnectionDrawingManager.prototype._attachConnectionSourcePointHandler = function (elements, objId, sCompId) {
        var self = this;

        if (elements && elements.length > 0) {
            //register connection-draw start handler
            elements.on(MOUSEDOWN, function (event) {
                event.stopPropagation();
                event.preventDefault();
            });
            if (elements.hasClass('ui-draggable')) {
                elements.draggable('destroy');
            }
            elements.draggable({
                helper: function () {
                    return $("<div class='" + DRAW_CONNECTION_DRAG_HELPER_CLASS + "'></div>");
                },
                start: function (event) {
                    var el = $(this);
                    event.stopPropagation();
                    if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.NORMAL) {
                        el.addClass(ACCEPT_CLASS);
                        self._startConnectionDraw(el, objId, sCompId, event);
                        self._dragScroll.start();
                    }
                },
                stop: function (event) {
                    var el = $(this);
                    event.stopPropagation();
                    if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION) {
                        self._endConnectionDraw(event);
                        el.removeClass(ACCEPT_CLASS);
                    }
                },
                drag: function (event) {
                    if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION) {
                        self._onMouseMove(event);
                    }
                }
            });
        }
    };

    ConnectionDrawingManager.prototype._attachConnectionEndPointHandler = function (elements, objId, sCompId) {
        var self = this,
            droppableEl = elements.not(this._connectionInDrawProps.srcEl);

        if (droppableEl && droppableEl.length > 0) {

            droppableEl.on(MOUSEENTER, function (/*event*/) {
                //TODO: potentially more complex 'OK' function needs to be provided
                //ie: can the connection really be drawn here from source
                $(this).addClass(HOVER_CLASS);
            }).on(MOUSELEAVE, function (/*event*/) {
                $(this).removeClass(HOVER_CLASS);
            }).on(MOUSEUP, function (event) {
                if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION ||
                    self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION) {
                    self._detachConnectionEndPointHandler(droppableEl);
                    self._connectionEndDrop(objId, sCompId, event);
                }
            });

            this._connectionInDrawProps.lastAttachedDroppableEl = droppableEl;
        }
    };

    ConnectionDrawingManager.prototype._startConnectionDraw = function (el, objId, sCompId, event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            srcCoord;

        this._diagramDesigner.beginMode(this._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION);

        this.logger.debug("Start connection drawing from DesignerItem: '" + objId + "', subcomponent: '" + sCompId + "'");

        this._connectionInDraw = true;

        this._connectionInDrawProps = {"src": objId,
                                        "sCompId": sCompId,
                                        "srcEl": el,
                                        "type": DRAW_TYPE_CREATE,
                                        "lastAttachedDroppableEl": undefined};

        srcCoord = this._getClosestConnectionPointCoordinates(objId, sCompId, mousePos.mX, mousePos.mY);

        this._connectionDesc = { "x": srcCoord.x,
            "y": srcCoord.y,
            "x2": mousePos.mX,
            "y2": mousePos.mY };

        this._drawConnection();

        this._diagramDesigner.selectionManager.clear();
    };

    ConnectionDrawingManager.prototype._onMouseMove = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            srcCoord = this._getClosestConnectionPointCoordinates(this._connectionInDrawProps.src, this._connectionInDrawProps.sCompId, mousePos.mX, mousePos.mY);
  
        if (this._connectionInDraw === true) {
            
            this._connectionDesc.x = srcCoord.x;
            this._connectionDesc.y = srcCoord.y;

            this._connectionDesc.x2 = mousePos.mX;
            this._connectionDesc.y2 = mousePos.mY;

            this._drawConnection();
        }
    };

    ConnectionDrawingManager.prototype._endConnectionDraw = function (event) {
        var mousePos = event ? this._diagramDesigner.getAdjustedMousePos(event) : undefined,
            srcCoord;

        if (this._connectionInDraw === true && mousePos) {
            srcCoord = this._getClosestConnectionPointCoordinates(this._connectionInDrawProps.src, this._connectionInDrawProps.sCompId, mousePos.mX, mousePos.mY);

            this._connectionDesc.x = srcCoord.x;
            this._connectionDesc.y = srcCoord.y;

            this._connectionDesc.x2 = mousePos.mX;
            this._connectionDesc.y2 = mousePos.mY;

            this._drawConnection();
        }

        this._detachConnectionEndPointHandler(this._connectionInDrawProps.lastAttachedDroppableEl);

        this._connectionInDraw = false;

        this._connectionPath.remove();
        this._connectionPath = undefined;

        this._connectionInDrawProps = undefined;

        this._diagramDesigner.endMode(this._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION);

        this.logger.debug("Stopped connection drawing");
    };

    ConnectionDrawingManager.prototype._drawConnection = function () {
        var x = this._connectionDesc.x,
            y = this._connectionDesc.y,
            x2 = this._connectionDesc.x2,
            y2 = this._connectionDesc.y2,
            pathDefinition,
            minConnLength = 7;

        if (Math.sqrt((x2 - x) * (x2 - x) + (y2 - y) * (y2 - y)) < minConnLength) {
            return;
        }

        pathDefinition = "M" + x + "," + y + "L" + x2 + "," + y2;

        if (this._connectionPath === undefined) {
            this._connectionPath = this._paper.path(pathDefinition);

            this._connectionPath.attr({   "stroke-width": this._connectionPathProps.strokeWidth,
                "stroke": this._connectionPathProps.strokeColor,
                "stroke-dasharray": this._connectionPathProps.lineType,
                "arrow-start": this._connectionPathProps.arrowStart,
                "arrow-end": this._connectionPathProps.arrowEnd });
        } else {
            this._connectionPath.attr({ "path": pathDefinition});
        }
    };

    ConnectionDrawingManager.prototype._getClosestConnectionPointCoordinates = function (objId, sCompId, mX, mY) {
        var item = this._diagramDesigner.items[objId],
            result,
            connPoints,
            len,
            delta,
            d1,
            x,
            y;

        if (item) {
            connPoints = item.getConnectionAreas(sCompId) || [];

            len = connPoints.length;
            result = { 'x': item.positionX + connPoints[len-1].x + connPoints[len-1].w / 2,
                       'y': item.positionY + connPoints[len-1].y + connPoints[len-1].h / 2};
            delta = Math.sqrt((result.x - mX) * (result.x - mX) + (result.y - mY) * (result.y - mY));

            len -= 1;

            while (len--) {
                x = item.positionX + connPoints[len].x + connPoints[len].w / 2;
                y = item.positionY + connPoints[len].y + connPoints[len].h / 2;
                d1 = Math.sqrt((x - mX) * (x - mX) + (y - mY) * (y - mY));
                if ( d1 < delta) {
                    delta = d1;
                    result = {'x': x,
                                'y': y};
                }
            }
        }

        return result;
    };

    ConnectionDrawingManager.prototype._connectionEndDrop = function (endPointId, sCompId, event) {
        this.logger.debug("Connection end dropped on item: '" + endPointId + "', sCompId: '" + sCompId + "'");

        if (this._diagramDesigner.mode === this._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION) {
            if (this._connectionInDrawProps && this._connectionInDrawProps.src) {
                this._diagramDesigner.createNewConnection({ "src": this._connectionInDrawProps.src,
                        "srcSubCompId": this._connectionInDrawProps.sCompId,
                        "dst": endPointId,
                        "dstSubCompId": sCompId,
                        "metaInfo": this._metaInfo });
            }
        } else if (this._diagramDesigner.mode === this._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION) {
            if (this._connectionRedrawProps && this._connectionRedrawProps.connId) {
                this._diagramDesigner.modifyConnectionEnd({ "id": this._connectionRedrawProps.connId,
                    "endPoint": this._connectionRedrawProps.srcDragged === true ? "SOURCE" : "END",
                    "endId": endPointId,
                    "endSubCompId": sCompId });
                //TODO:not yet sure why it is needed here, it should be called because of the draggable end
                this._endConnectionRedraw(event);
            }
        }
    };

    ConnectionDrawingManager.prototype.setConnectionInDrawProperties = function (params) {
        this._connectionPathProps.strokeWidth = params.width || this._connectionPathProps.strokeWidth;

        this._connectionPathProps.strokeColor = params.color || this._connectionPathProps.strokeColor;
        this._connectionPathProps.arrowStart = params.arrowStart || this._connectionPathProps.arrowStart;
        this._connectionPathProps.arrowEnd = params.arrowEnd || this._connectionPathProps.arrowEnd;
    };

    ConnectionDrawingManager.prototype.setMetaInfo = function (mInfo) {
        this._metaInfo = mInfo;
    };

    ConnectionDrawingManager.prototype.getMetaInfo = function () {
        return this._metaInfo;
    };

    /********************** CONNECTION RECONNECT *********************************/

    ConnectionDrawingManager.prototype._attachConnectionDraggableEndHandler = function (srcParams, dstParams, connParams) {
        var srcEl = srcParams.el,
            dstEl = dstParams.el,
            connID = connParams.id,
            connProps = connParams.props;

        this._attachDraggableForRedraw(srcEl, { "srcDragged": true,
                                                "connId": connID,
                                                "connProps": connProps });

        this._attachDraggableForRedraw(dstEl, { "srcDragged": false,
                                                "connId": connID,
                                                "connProps": connProps });
    };

    ConnectionDrawingManager.prototype._attachDraggableForRedraw = function (el, params) {
        var self = this;

        //register connection-draw start handler
        el.on(MOUSEDOWN, function (event) {
            event.stopPropagation();
            event.preventDefault();
        });

        if (el.hasClass('ui-draggable')) {
            el.draggable('destroy');
        }
        el.draggable({
            helper: function () {
                return $("<div class='" + DRAW_CONNECTION_DRAG_HELPER_CLASS + "'></div>");
            },
            start: function (event) {
                var el = $(this);
                event.stopPropagation();
                if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.NORMAL) {
                    el.addClass(ACCEPT_CLASS);
                    self._connectionRedrawProps = params;
                    self._startConnectionRedraw(event);
                    self._dragScroll.start();
                }
            },
            stop: function (event) {
                var el = $(this);
                event.stopPropagation();
                if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION) {
                    self._endConnectionRedraw(event);
                    el.removeClass(ACCEPT_CLASS);
                }
            },
            drag: function (event) {
                if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION) {
                    self._onConnectionRedrawMouseMove(event);
                }
            }
        });
    };

    ConnectionDrawingManager.prototype._startConnectionRedraw = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event);

        this._diagramDesigner.beginMode(this._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION);

        this.logger.debug("Start connection redrawing, connection: '" + this._connectionRedrawProps.connId + "', props: '" + JSON.stringify(this._connectionRedrawProps) + "'");

        this._connectionInDraw = true;

        this._connectionDesc = { "x": 0,
                                 "y": 0,
                                 "x2": 0,
                                 "y2": 0 };

        this._connectionInDrawProps = {};


        this._connectionInDrawProps.type = DRAW_TYPE_RECONNECT;

        this._setConnectionRedrawCoordinates(mousePos);        

        this._connectionPath = this._paper.path('M' + this._connectionDesc.x + ',' + this._connectionDesc.y + ' L' + this._connectionDesc.x2 + ',' + this._connectionDesc.y2);

        this._connectionPath.attr(
            {   "stroke-width": this._connectionRedrawProps.connProps.width,
                "stroke": IN_DRAW_COLOR,
                "stroke-dasharray": IN_DRAW_LINETYPE,
                "arrow-start": this._connectionRedrawProps.connProps.arrowStart,
                "arrow-end": this._connectionRedrawProps.connProps.arrowEnd }
        );

        this._diagramDesigner.selectionManager.hideSelectionOutline();
    };

    ConnectionDrawingManager.prototype._setConnectionRedrawCoordinates = function (mousePos) {
        var connID = this._connectionRedrawProps.connId,
            coord;

        if (connID) {
            if (this._connectionRedrawProps.srcDragged === true ) {
                //source end of the connection is dragged
                if (this._diagramDesigner.connectionEndIDs[connID]) {
                    var dstObjId = this._diagramDesigner.connectionEndIDs[connID].dstObjId;
                    var dstSubCompId = this._diagramDesigner.connectionEndIDs[connID].dstSubCompId;

                    coord = this._getClosestConnectionPointCoordinates(dstObjId, dstSubCompId, mousePos.mX, mousePos.mY);

                    this._connectionDesc.x = mousePos.mX; 
                    this._connectionDesc.y = mousePos.mY;
                    this._connectionDesc.x2 = coord.x;
                    this._connectionDesc.y2 = coord.y;
                }                
            } else {
                //target end of the connection is dragged
                if (this._diagramDesigner.connectionEndIDs[connID]) {
                    var srcObjId = this._diagramDesigner.connectionEndIDs[connID].srcObjId;
                    var srcSubCompId = this._diagramDesigner.connectionEndIDs[connID].srcSubCompId;

                    coord = this._getClosestConnectionPointCoordinates(srcObjId, srcSubCompId, mousePos.mX, mousePos.mY);

                    this._connectionDesc.x2 = mousePos.mX; 
                    this._connectionDesc.y2 = mousePos.mY;
                    this._connectionDesc.x = coord.x;
                    this._connectionDesc.y = coord.y;
                }                
            }
        }
    };

    ConnectionDrawingManager.prototype._onConnectionRedrawMouseMove = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event);
  
        if (this._connectionInDraw === true) {
            this._setConnectionRedrawCoordinates(mousePos);    

            this._drawConnection();
        }
    };

    ConnectionDrawingManager.prototype._endConnectionRedraw = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event);

        if (this._connectionInDraw === true) {
            this._setConnectionRedrawCoordinates(mousePos);

            this._drawConnection();
        }

        this._connectionInDraw = false;

        this._connectionPath.remove();
        this._connectionPath = undefined;

        this._connectionInDrawProps = undefined;

        this._connectionRedrawProps = {};
        delete this._connectionRedrawProps;

        this._diagramDesigner.endMode(this._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION);

        this._diagramDesigner.selectionManager.showSelectionOutline();

        this.logger.debug("Stopped connection redrawing");
    };

    /********************* END OF - CONNECTION RECONNECT *********************************/


    /***************** COMPONENT DELETED FROM DIAGRAM-DESIGNER *****************/

    ConnectionDrawingManager.prototype._onComponentDelete = function (objID, sCompID) {
        var cancelDraw = false,
            el;

        if (this._connectionInDrawProps) {
            if (!sCompID) {
                //sCompID is undefined --> component with objID is being deleted from canvas
                if (this._connectionInDrawProps.src === objID) {
                    //connection is being drawn from this component
                    cancelDraw = true;
                    this.logger.warning('Connection source "' + objID + '" is being deleted. Connection creation canceled.');
                }
            } else {
                //sCompID has a value
                //this specific subcomponent from the component with objID is being removed
                if (this._connectionInDrawProps.src === objID &&
                    this._connectionInDrawProps.sCompId === sCompID) {
                    //connection is being drawn from this component's this subcompoentn
                    cancelDraw = true;
                    this.logger.warning('Connection source "' + objID + '"/"' + sCompID + '" is being deleted. Connection creation canceled.');
                }
            }

            if (cancelDraw === true) {
                el = this._connectionInDrawProps.srcEl;
                
                this._connectionInDraw = false;
                this._endConnectionDraw();

                //clear connection descriptor --> this way the connection end drop will not accidentally happen when 
                //mouseup happens
                this._connectionInDrawProps = {};
                //imitate mouseup
                el.trigger('mouseup');
            }
        }
    };

    /************** END OF - COMPONENT DELETED FROM CANVAS ***********/

    /************** EVENT HANDLER - CANVAS ITEM POSITION CHANGED *****/
    ConnectionDrawingManager.prototype._canvasItemPositionChanged = function (event) {
        var id = event.ID || event.ItemID,
            /*subComponentID = event.SubComponentID,*/
            srcCoord;

        if (this._connectionInDraw === false) {
            return;
        }

        if (this._connectionInDrawProps && this._connectionInDrawProps.src === id) {
            //the item the connection is being drawn from has been repositioned
            srcCoord = this._getClosestConnectionPointCoordinates(this._connectionInDrawProps.src, this._connectionInDrawProps.sCompId, this._connectionDesc.x2, this._connectionDesc.y2);

            this._connectionDesc.x = srcCoord.x;
            this._connectionDesc.y = srcCoord.y;

            this._drawConnection();
        } else if (this._connectionRedrawProps && this._connectionRedrawProps.connId) {
            //connection redraw is happening
            var connID = this._connectionRedrawProps.connId;
            var fixEndObjId;
            var fixEndSubCompId;
            if (this._connectionRedrawProps.srcDragged === true ) {
                //source end of the connection is dragged
                if (this._diagramDesigner.connectionEndIDs[connID]) {
                    fixEndObjId = this._diagramDesigner.connectionEndIDs[connID].dstObjId;
                    fixEndSubCompId = this._diagramDesigner.connectionEndIDs[connID].dstSubCompId;

                    srcCoord = this._getClosestConnectionPointCoordinates(fixEndObjId, fixEndSubCompId, this._connectionDesc.x, this._connectionDesc.y);

                    this._connectionDesc.x2 = srcCoord.x;
                    this._connectionDesc.y2 = srcCoord.y;

                    this._drawConnection();
                }
            } else {
                //target end of the connection is dragged
                if (this._diagramDesigner.connectionEndIDs[connID]) {
                    fixEndObjId = this._diagramDesigner.connectionEndIDs[connID].srcObjId;
                    fixEndSubCompId = this._diagramDesigner.connectionEndIDs[connID].srcSubCompId;

                    srcCoord = this._getClosestConnectionPointCoordinates(fixEndObjId, fixEndSubCompId, this._connectionDesc.x2, this._connectionDesc.y2);

                    this._connectionDesc.x = srcCoord.x;
                    this._connectionDesc.y = srcCoord.y;

                    this._drawConnection();
                }
            }
        }
    };
    /******END OF - EVENT HANDLER - CANVAS ITEM POSITION CHANGED *****/

    ConnectionDrawingManager.prototype.readOnlyMode = function (readOnly) {
    };

    return ConnectionDrawingManager;
});
