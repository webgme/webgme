"use strict";

define(['logManager',
        'js/Widgets/DiagramDesigner/DragScroll',
        './DiagramDesignerWidget.Constants'], function (logManager,
                                                    DragScroll,
                                                    DiagramDesignerWidgetConstants) {

    var ConnectionDrawingManager,
        EVENTPOSTFIX = 'ConnectionDrawingManager',
        MOUSEDOWN = 'mousedown.' + EVENTPOSTFIX,
        MOUSEMOVE = 'mousemove.' + EVENTPOSTFIX,
        MOUSEUP = 'mouseup.' + EVENTPOSTFIX,
        MOUSEENTER = 'mouseenter.' + EVENTPOSTFIX,
        MOUSELEAVE = 'mouseleave.' + EVENTPOSTFIX,
        CONNECTION_END_ACCEPT_CLASS = 'connection-end-accept',
        CONNECTION_END_REJECT_CLASS = 'connection-end-reject',
        IN_DRAW_COLOR = "#FF7800",
        IN_DRAW_LINETYPE = "-",
        DRAW_TYPE_CREATE = "create",
        DRAW_TYPE_RECONNECT = "reconnect";


    /*
     * Connection Manager handles connection drawing between 'connector'-s and handles
     * Connection Reconnect when you drag an existing connection end and drop it on a valid connector
     * It draws the connection on a Raphael SVG paper
     */
    ConnectionDrawingManager = function (options) {
        this.logger = logManager.create(((options && options.loggerName) || "ConnectionDrawingManager"));

        this._diagramDesigner = options ? options.diagramDesigner : null;

        if (this._diagramDesigner === undefined || this._diagramDesigner === null) {
            this.logger.error("Trying to initialize a ConnectionDrawingManager without a diagramDesigner...");
            throw ("ConnectionDrawingManager can not be created");
        }

        this.logger.debug("ConnectionDrawingManager ctor finished");
    };


    /*
     * Called after creating the instance
     * Params:
     * el: the DOM element that contains the possible 'connector' DOM elements
     */
    ConnectionDrawingManager.prototype.initialize = function (el) {
        var self = this;

        //local variables for internal use
        this._paper = this._diagramDesigner.skinParts.SVGPaper;
        this._metaInfo = null;
        this._connectionInDraw = false;

        //visual properties of the drawn connection
        this._connectionPathProps = { "strokeWidth" : 2,
            "strokeColor" : IN_DRAW_COLOR,
            "lineType": IN_DRAW_LINETYPE,
            "arrowStart": "none",
            "arrowEnd": "none" };

        //listen to events of the host DiagramDesigner for item/sub-component relocation/deletion
        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ITEM_POSITION_CHANGED, function (_canvas, event) {
            self._designerItemPositionChanged(event.ID);
        });

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ITEM_SUBCOMPONENT_POSITION_CHANGED, function (_canvas, event) {
            self._designerItemPositionChanged(event.ItemID);
        });

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ON_COMPONENT_DELETE, function (_canvas, componentId) {
            self._onComponentDelete(componentId);
        });

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ON_UNREGISTER_SUBCOMPONENT, function (_canvas, eventArgs) {
            self._onComponentDelete(eventArgs.objectID, eventArgs.subComponentID);
        });

        this._dragScroll = new DragScroll(this._diagramDesigner.skinParts.$diagramDesignerWidgetBody);

        //save container DOM element on which ConnectionDrawingManager is listening for mouse events
        this._el = el;

        //MOUSE LISTENER FOR CONNECTOR MOUSEDOWN --> CREATE NEW CONNECTION
        this._el.on(MOUSEDOWN, '.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS, function (event) {
            var el = $(this),
                objId = el.attr(DiagramDesignerWidgetConstants.DATA_ITEM_ID),
                sCompId = el.attr(DiagramDesignerWidgetConstants.DATA_SUBCOMPONENT_ID),
                buttonLeft = event.which === 1;

            if (buttonLeft) {
                if (objId === undefined || objId === null) {
                    self.logger.error('MOUSEDOWN on "connector" element but attribute "' + DiagramDesignerWidgetConstants.DATA_ITEM_ID + '" is not specified');
                } else {
                    if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.NORMAL) {
                        self._startConnectionCreate(objId, sCompId, el, self._diagramDesigner.getAdjustedMousePos(event));
                        self._attachMouseListeners();
                    }
                }
            }

            event.stopPropagation();
            event.preventDefault();
        });

        //MOUSE LISTENER FOR CONNECTION END MOUSEDOWN --> RECONNECT CONNECTION END
        this._el.on(MOUSEDOWN, '.' + DiagramDesignerWidgetConstants.CONNECTION_DRAGGABLE_END_CLASS, function (event) {
            var el = $(this),
                draggedEnd = el.attr("data-end"),
                connId = el.attr("data-id"),
                buttonLeft = event.which === 1;

            if (buttonLeft) {
                if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.NORMAL) {
                    self._startConnectionReconnect(connId, draggedEnd, self._diagramDesigner.getAdjustedMousePos(event));
                    self._attachMouseListeners();
                }
            }

            event.stopPropagation();
            event.preventDefault();
        });

        //MOUSE LISTENER FOR CONNECTION MOUSEENTER / MOSELEAVE / MOUSEUP MOUSEDOWN --> POTENTIAL CONNECTION END
        this._el.on(MOUSEENTER, '.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS, function (/*event*/) {
                var el = $(this);
                if (self._connectionInDraw === true) {
                    if (self._acceptConnectionEndDrop(el) == true) {
                        $(this).addClass(CONNECTION_END_ACCEPT_CLASS);
                    } else {
                        $(this).addClass(CONNECTION_END_REJECT_CLASS);
                    }
                }
            }).on(MOUSELEAVE, '.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS, function (/*event*/) {
                if (self._connectionInDraw === true) {
                    $(this).removeClass([CONNECTION_END_ACCEPT_CLASS, CONNECTION_END_REJECT_CLASS].join(' '));
                }
            }).on(MOUSEUP, '.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS, function (/*event*/) {
                var el = $(this),
                    objId = el.attr(DiagramDesignerWidgetConstants.DATA_ITEM_ID),
                    sCompId = el.attr(DiagramDesignerWidgetConstants.DATA_SUBCOMPONENT_ID);

                if (self._connectionInDraw === true) {
                    $(this).removeClass([CONNECTION_END_ACCEPT_CLASS, CONNECTION_END_REJECT_CLASS].join(' '));

                    if (objId === undefined || objId === null) {
                        self.logger.error('MOUSEUP on "connector" element but attribute "' + DiagramDesignerWidgetConstants.DATA_ITEM_ID + '" is not specified');
                    } else {
                        if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION ||
                            self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION) {
                            if (self._acceptConnectionEndDrop(el) == true) {
                                self._connectionEndDrop(objId, sCompId);
                            }
                        }
                    }
                }
        });
    };


    /*
     * Sets the visual properties of the line representing the connection being drawn
     * Params: object with the following keys
     * width : the width of the line
     * color: the color of the line
     * arrowStart: the Raphael defined line-end arrow at the beginning of the line
     * arrowEnd: the Raphael defined line-end arrow at the end of the line
     */
    ConnectionDrawingManager.prototype.setConnectionInDrawProperties = function (params) {
        this._connectionPathProps.strokeWidth = params.width || this._connectionPathProps.strokeWidth;

        this._connectionPathProps.strokeColor = params.color || this._connectionPathProps.strokeColor;
        this._connectionPathProps.arrowStart = params.arrowStart || this._connectionPathProps.arrowStart;
        this._connectionPathProps.arrowEnd = params.arrowEnd || this._connectionPathProps.arrowEnd;
    };


    /*
     * Sets the metaInfo belongs to the connection being drawn
     * This information will be passed along to the callback 'createNewConnection' on new connection creation
     */
    ConnectionDrawingManager.prototype.setMetaInfo = function (mInfo) {
        this._metaInfo = mInfo;
    };


    /*
     * Returns the metaInfo belongs to the connection being drawn
     */
    ConnectionDrawingManager.prototype.getMetaInfo = function () {
        return this._metaInfo;
    };


    /*
     * Attaches MouseMove and MouseUp on document when the connection draw/reconnect started
     */
    ConnectionDrawingManager.prototype._attachMouseListeners = function () {
        var self = this;

        $(document).on(MOUSEMOVE, function (event) {
            self._onBackgroundMouseMove(event);
            event.stopPropagation();
            event.preventDefault();
        });
        $(document).on(MOUSEUP, function (event) {
            self._onBackgroundMouseUp(event);
            event.stopPropagation();
            event.preventDefault();
        });
    };




    /************************** METHODS FOR INTERNAL USE ONLY ********************************/


    /*
     * Detaches MouseMove and MouseUp on document when the connection draw/reconnect finished
     */
    ConnectionDrawingManager.prototype._detachMouseListeners = function () {
        //unbind mousemove and mouseup handlers
        $(document).off(MOUSEMOVE);
        $(document).off(MOUSEUP);
    };


    /*
     * Determines if a specific connector can be a valid endpoint for a connection being drawn
     * Returns true if the connection end can be dropped on the specific connector
     * Returns false if not
     *
     * Note: connection end cannot be dropped on the same connector it is drawn from
     */
    //TODO: since acceptable endpoint are pre-checked, this might not be needed anymore
    ConnectionDrawingManager.prototype._acceptConnectionEndDrop = function (el) {
        var accept = false,
            objId = el.attr(DiagramDesignerWidgetConstants.DATA_ITEM_ID),
            sCompId = el.attr(DiagramDesignerWidgetConstants.DATA_SUBCOMPONENT_ID);

        if (this._connectionInDrawProps.type === DRAW_TYPE_CREATE) {
            if (this._connectionInDrawProps.srcEl[0] !== el[0]) {
                accept = this._diagramDesigner.onConnectionCreateConnectableAccept({"srcObjId": this._connectionInDrawProps.src,
                    "srcSubCompId": this._connectionInDrawProps.sCompId,
                    "connEndId": objId,
                    "connEndSubCompId": sCompId,
                    "metaInfo": this._metaInfo});
            }
        } else {
            accept = this._diagramDesigner.onConnectionReconnectConnectableAccept({"connId": this._connectionInDrawProps.connId,
                "draggedEnd": this._connectionInDrawProps.draggedEnd,
                "connEndId": objId,
                "connEndSubCompId": sCompId});
        }

        return accept;
    };


    /*
     * Draws the actual connection line from the start coordinates to the given end coordinates
     */
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

        if (this._connectionInDrawProps.type === DRAW_TYPE_RECONNECT) {
            var connProps = this._diagramDesigner.items[this._connectionInDrawProps.connId].getConnectionProps();

            this._connectionPath.attr(
                {   "stroke-width": connProps.width,
                    "arrow-start": connProps.arrowStart,
                    "arrow-end": connProps.arrowEnd }
            );
        }
    };

    /*
     * Based on the actual mouse position returns the coordinates of the closest connection point of the source of the connection
     * Params:
     * objId: the designer-item ID the connection is drawn from
     * sCompId: the sub-component ID the connection is drawn from [optional]
     * mX: actual mouse coordinate X
     * mY: actual mouse coordinate Y
     */
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


    /*
     * Called when a connection end is dropped on an accepting connector
     * Params:
     * endPointId: ID of the designer-item the connector represent
     * sCompId: ID of the sub-component inside the designer-item the connector represents [optional]
     */
    ConnectionDrawingManager.prototype._connectionEndDrop = function (endPointId, sCompId) {
        this.logger.debug("Connection end dropped on item: '" + endPointId + "', sCompId: '" + sCompId + "'");

        if (this._connectionInDrawProps.type === DRAW_TYPE_CREATE) {
            this._diagramDesigner.createNewConnection({ "src": this._connectionInDrawProps.src,
                    "srcSubCompId": this._connectionInDrawProps.sCompId,
                    "dst": endPointId,
                    "dstSubCompId": sCompId,
                    "metaInfo": this._metaInfo });
        } else if (this._connectionInDrawProps.type === DRAW_TYPE_RECONNECT) {
            this._diagramDesigner.modifyConnectionEnd({ "id": this._connectionInDrawProps.connId,
                "endPoint": this._connectionInDrawProps.draggedEnd === DiagramDesignerWidgetConstants.CONNECTION_END_SRC ? "SOURCE" : "END",
                "endId": endPointId,
                "endSubCompId": sCompId });
        }
    };


    /*
     * Start creating a connection from a connector
     * Params:
     * objId: ID of the designer-item the connection is being drawn from
     * sCompId: ID of the sub-component inside the designer-item the connection is being drawn from
     * el: the jQuery object representing the connector DOM element the connection is being drawn from
     * mousePos: mouse position event belongs to the 'mousedown' event on the connector
     */
    ConnectionDrawingManager.prototype._startConnectionCreate = function (objId, sCompId, el, mousePos) {
        var srcCoord;

        this._diagramDesigner.beginMode(this._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION);

        this.logger.debug("Start connection drawing from DesignerItem: '" + objId + "', subcomponent: '" + sCompId + "'");

        this._connectionInDraw = true;

        this._connectionInDrawProps = {"src": objId,
            "sCompId": sCompId,
            "srcEl": el,
            "type": DRAW_TYPE_CREATE};

        srcCoord = this._getClosestConnectionPointCoordinates(objId, sCompId, mousePos.mX, mousePos.mY);
        this._connectionDesc = { "x": srcCoord.x,
            "y": srcCoord.y,
            "x2": mousePos.mX,
            "y2": mousePos.mY };

        this._drawConnection();

        //init auto-scroll if mouse moves out of widget
        this._dragScroll.start();

        //fire event
        this.onStartConnectionCreate({'srcId': objId,
            'srcSubCompId': sCompId});
    };

    /*
     * Called on connection drawing start, should be overridden to handle the event
     */
    ConnectionDrawingManager.prototype.onStartConnectionCreate = function (params) {
        this.logger.warning("onStartConnectionCreate with params: '" + JSON.stringify(params));
    };


    /*
     * Start reconnecting an existing connection
     * Params:
     * connectionId: ID of the designer-connection being redrawn
     * draggedEnd: 'src' or 'dst' representing if the source or the destination end of the connection is being reconnected
     * mousePos: mouse position event belongs to the 'mousedown' event on the connector
     */
    ConnectionDrawingManager.prototype._startConnectionReconnect = function (connectionId, draggedEnd, mousePos) {
        this._diagramDesigner.beginMode(this._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION);

        this.logger.debug('_startConnectionReconnect connectionId:' + connectionId + ', draggedEnd:' + draggedEnd);

        this._connectionInDraw = true;

        this._connectionInDrawProps = { "connId": connectionId,
                                        "draggedEnd": draggedEnd,
                                        "type": DRAW_TYPE_RECONNECT};

        this._connectionDesc = { "x": 0,
            "y": 0,
            "x2": 0,
            "y2": 0 };
        this._setConnectionRedrawCoordinates(mousePos);

        this._drawConnection();

        //init auto-scroll if mouse moves out of widget
        this._dragScroll.start();

        //fire event
        this.onStartConnectionReconnect({'connId': connectionId,
            'draggedEnd': draggedEnd});
    };

    /*
     * Called on connection reconnect start, should be overridden to handle the event
     */
    ConnectionDrawingManager.prototype.onStartConnectionReconnect = function (params) {
        this.logger.warning("onStartConnectionReconnect with params: '" + JSON.stringify(params));
    };


    /*
     * Calculate the coordinates for the connection being redrawn based on the mouse position
     * Params:
     * mousePos: the current mouse position
     */
    ConnectionDrawingManager.prototype._setConnectionRedrawCoordinates = function (mousePos) {
        var connID = this._connectionInDrawProps.connId,
            srcDragged = this._connectionInDrawProps.draggedEnd === DiagramDesignerWidgetConstants.CONNECTION_END_SRC,
            coord;

        if (connID) {
            if (srcDragged === true ) {
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


    /*
     * Calculate the coordinates for the connection being created based on the mouse position and the source
     * Params:
     * mousePos: the current mouse position
     */
    ConnectionDrawingManager.prototype._setConnectionCreateCoordinates = function (mousePos) {
        var srcCoord = this._getClosestConnectionPointCoordinates(this._connectionInDrawProps.src, this._connectionInDrawProps.sCompId, mousePos.mX, mousePos.mY);

        this._connectionDesc.x = srcCoord.x;
        this._connectionDesc.y = srcCoord.y;

        this._connectionDesc.x2 = mousePos.mX;
        this._connectionDesc.y2 = mousePos.mY;
    };


    /*
     * Called on 'mousemove' when a connection is being drawn or reconnected
     */
    ConnectionDrawingManager.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event);

        if (this._connectionInDraw === true) {
            this._updateDrawnConnection(mousePos);
        }
    };


    /*
     * Updates the source and end coordinates of the line being drawn and forces the redraw of the SVG path
     */
    ConnectionDrawingManager.prototype._updateDrawnConnection = function (mousePos) {
        if (this._connectionInDrawProps.type === DRAW_TYPE_CREATE) {
            this._setConnectionCreateCoordinates(mousePos);
        } else if (this._connectionInDrawProps.type === DRAW_TYPE_RECONNECT) {
            this._setConnectionRedrawCoordinates(mousePos);
        }

        this._drawConnection();
    };


    /*
     * Called on 'mouseup' (on the backgournd) when the connection drawing ends
     * Handle exiting from connection drawn mode (unregister mouse event handlers, remove line, etc)
     *
     * NOTE: connection end drop is handled in '_connectionEndDrop'
     */
    ConnectionDrawingManager.prototype._onBackgroundMouseUp = function (/*event*/) {
        this.logger.debug('_onBackgroundMouseUp');

        this._detachMouseListeners();

        this._endConnectionDraw();
    };

    /*
     * Finish the drawing of the connection
     * - remove the SVG path from the Raphael paper
     * - clean up connection drawing variables
     */
    ConnectionDrawingManager.prototype._endConnectionDraw = function () {
        var type = this._connectionInDrawProps.type;

        this._connectionInDraw = false;

        if (this._connectionPath) {
            this._connectionPath.remove();
            this._connectionPath = undefined;
        }

        this._connectionInDrawProps = undefined;

        this._el.find('.' + CONNECTION_END_ACCEPT_CLASS).removeClass(CONNECTION_END_ACCEPT_CLASS);
        this._el.find('.' + CONNECTION_END_REJECT_CLASS).removeClass(CONNECTION_END_REJECT_CLASS);

        if (type === DRAW_TYPE_CREATE) {
            this._diagramDesigner.endMode(this._diagramDesigner.OPERATING_MODES.CREATE_CONNECTION);
        } else if (type === DRAW_TYPE_RECONNECT) {
            this._diagramDesigner.endMode(this._diagramDesigner.OPERATING_MODES.RECONNECT_CONNECTION);
        }

        //fire event
        this.onEndConnectionDraw();

        this.logger.debug("Stopped connection drawing");
    };

    /*
     * Called on connection create/reconnect end, should be overridden to handle the event
     */
    ConnectionDrawingManager.prototype.onEndConnectionDraw = function () {
        this.logger.warning("onEndConnectionDraw");
    };


    /*
     * Called when the host DiagramDesigner read-only mode changes
     * In read-only mode no connection drawing allowed...
     * TODO: handle accordingly
     */
    ConnectionDrawingManager.prototype.readOnlyMode = function (readOnly) {
    };


    /*
     * Called when a designer-item or a sub-component is being relocated on host DiagramDesigner
     * If an active connection is being drawn from that source, update the connection source coordinates accordingly
     */
    ConnectionDrawingManager.prototype._designerItemPositionChanged = function (objId) {
        if (this._connectionInDraw === false) {
            return;
        }

        if (this._connectionInDrawProps.type === DRAW_TYPE_CREATE) {
            if (this._connectionInDrawProps.src === objId) {
                //the item the connection is being drawn from has been repositioned
                this._setConnectionCreateCoordinates({'mX': this._connectionDesc.x2,
                                                      'mY': this._connectionDesc.y2});
                this._drawConnection();
            }
        } else if (this._connectionInDrawProps.type === DRAW_TYPE_RECONNECT) {
            //connection redraw is happening
            if (this._connectionInDrawProps.draggedEnd === DiagramDesignerWidgetConstants.CONNECTION_END_SRC ) {
                if (this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].dstObjId === objId) {
                    //'source' end of the connection is dragged
                    this._setConnectionRedrawCoordinates({'mX': this._connectionDesc.x,
                        'mY': this._connectionDesc.y});
                    this._drawConnection();
                }
            } else {
                if (this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].srcObjId === objId) {
                    //'destination' end of the connection is dragged
                    this._setConnectionRedrawCoordinates({'mX': this._connectionDesc.x2,
                                                      'mY': this._connectionDesc.y2});
                    this._drawConnection();
                }
            }
        }
    };


    /*
     * Called when a designer-item or a sub-component is being deleted from the host DiagramDesigner
     * If an active connection is being drawn from that source, stop & cancel connection drawing
     */
    ConnectionDrawingManager.prototype._onComponentDelete = function (objId, sCompID) {
        var cancelDraw = false;

        if (this._connectionInDraw === false) {
            return;
        }

        if (this._connectionInDrawProps.type === DRAW_TYPE_CREATE) {
            if (sCompID === undefined || sCompID === null) {
                //sCompID is undefined --> component with objID is being deleted from canvas
                if (this._connectionInDrawProps.src === objId) {
                    //connection is being drawn from this component
                    cancelDraw = true;
                    this.logger.debug('Connection source "' + objId + '" is being deleted. Connection creation canceled.');
                }
            } else {
                //sCompID has a value
                //this specific subcomponent from the component with objID is being removed
                if (this._connectionInDrawProps.src === objId &&
                    this._connectionInDrawProps.sCompId === sCompID) {
                    //connection is being drawn from this component's this subcomponent
                    cancelDraw = true;
                    this.logger.debug('Connection source "' + objId + '"/"' + sCompID + '" is being deleted. Connection creation canceled.');
                }
            }
        } else if (this._connectionInDrawProps.type === DRAW_TYPE_RECONNECT) {
            //connection redraw is happening
            //check if the connection itself is being removed or any end of it
            if (objId === this._connectionInDrawProps.connId) {
                //connection is being drawn from/to this component
                cancelDraw = true;
                this.logger.debug('Existing connection currently being redrawn "' + objId + '" is being deleted. Connection re-connect canceled.');
            } else {
                if (sCompID === undefined || sCompID === null) {
                    //a designer-item is being deleted
                    if (this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].srcObjId === objId ||
                        this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].dstObjId === objId) {
                        //connection is being drawn from/to this component
                        cancelDraw = true;
                        this.logger.debug('Existing connection endpoint "' + objId + '" is being deleted. Connection re-connect canceled.');
                    }
                } else {
                    //a subcomponent in a designer-item is being deleted
                    //a designer-item is being deleted
                    if ((this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].srcObjId === objId &&
                        this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].srcSubCompId === sCompID) ||
                        (this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].dstObjId === objId &&
                            this._diagramDesigner.connectionEndIDs[this._connectionInDrawProps.connId].dstSubCompId === sCompID)) {
                        //connection is being drawn from/to this component's this subcomponent
                        cancelDraw = true;
                        this.logger.debug('Existing connection endpoint "' + objId + '"/"' + sCompID + '" is being deleted. Connection creation canceled.');
                    }
                }
            }
        }

        if (cancelDraw === true) {
            this._detachMouseListeners();
            this._endConnectionDraw();
        }
    };


    return ConnectionDrawingManager;
});
