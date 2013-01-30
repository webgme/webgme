"use strict";

define(['logManager'], function (logManager) {

    var ConnectionDrawingManager,
        EVENTPOSTFIX = 'ConnectionDrawingManager',
        MOUSEDOWN = 'mousedown.' + EVENTPOSTFIX,
        MOUSEMOVE = 'mousemove.' + EVENTPOSTFIX,
        MOUSEUP = 'mouseup.' + EVENTPOSTFIX,
        MOUSEENTER = 'mouseenter.' + EVENTPOSTFIX,
        MOUSELEAVE = 'mouseleave.' + EVENTPOSTFIX,
        ACCEPT_CLASS = 'connection-source',
        HOVER_CLASS = 'connection-end-state-hover',
        IN_DRAW_COLOR = "#FF7800",
        IN_DRAW_LINETYPE = "-";

    ConnectionDrawingManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "ConnectionDrawingManager"));

        this.canvas = options ? options.canvas : null;

        if (this.canvas === undefined || this.canvas === null) {
            this.logger.error("Trying to initialize a ConnectionDrawingManager without a canvas...");
            throw ("ConnectionDrawingManager can not be created");
        }

        this.logger.debug("ConnectionDrawingManager ctor finished");
    };

    ConnectionDrawingManager.prototype.initialize = function () {
        this._connectionInDraw = false;
        this.paper = this.canvas.skinParts.SVGPaper;

        this._metaInfo = null;

        this._connectionPathProps = { "strokeWidth" : 2,
            "strokeColor" : "#FF7800",
            "lineType": "-",
            "arrowStart": "none",
            "arrowEnd": "none" };
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
            elements.draggable('destroy');
            elements.off(MOUSEDOWN);
        }
    };

    ConnectionDrawingManager.prototype._detachConnectionEndPointHandler = function (elements) {
        if (elements && elements.length > 0) {
            elements.droppable('destroy');
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
            elements.draggable('destroy');
            elements.draggable({
                helper: function () {
                    return $("<div class='draw-connection-drag-helper'></div>");
                },
                start: function (event) {
                    var el = $(this);
                    event.stopPropagation();
                    el.addClass(ACCEPT_CLASS);
                    self._startConnectionDraw(el, objId, sCompId);
                },
                stop: function (event) {
                    var el = $(this);
                    event.stopPropagation();
                    self._endConnectionDraw(event);
                    el.removeClass(ACCEPT_CLASS);
                },
                drag: function (event) {
                    self._onMouseMove(event);
                }
            });
        }
    };

    ConnectionDrawingManager.prototype._attachConnectionEndPointHandler = function (elements, objId, sCompId) {
        var self = this,
            droppableEl = elements.not(this._connectionInDrawProps.srcEl);

        if (droppableEl && droppableEl.length > 0) {

            droppableEl.on(MOUSEENTER, function (event) {
                //TODO: potentially more complex 'OK' function needs to be provided
                //ie: can the connection really be drawn here from source
                $(this).addClass(HOVER_CLASS);
            }).on(MOUSELEAVE, function (event) {
                $(this).removeClass(HOVER_CLASS);
            }).on(MOUSEUP, function (event) {
                self._detachConnectionEndPointHandler(droppableEl);
                self._connectionEndDrop(objId, sCompId);
            });

            this._connectionInDrawProps.lastAttachedDroppableEl = droppableEl;
        }
    };

    ConnectionDrawingManager.prototype._startConnectionDraw = function (el, objId, sCompId) {
        var itemBBox;

        itemBBox = { "x": el.offset().left,
                "y": el.offset().top,
                "width": el.outerWidth(),
                "height": el.outerHeight()};

        itemBBox.x -= this.canvas.designerCanvasBodyOffset.left;
        itemBBox.y -= this.canvas.designerCanvasBodyOffset.top;

        this.canvas.beginMode(this.canvas.OPERATING_MODES.CREATE_CONNECTION);

        this.logger.debug("Start connection drawing from DesignerItem: '" + objId + "', subcomponent: '" + sCompId + "'");

        this._connectionInDraw = true;
        this._connectionDesc = { "x": itemBBox.x + itemBBox.width / 2,
                                 "y": itemBBox.y + itemBBox.height / 2,
                                 "x2": itemBBox.x + itemBBox.width / 2,
                                 "y2": itemBBox.y + itemBBox.height / 2 };

        this._connectionInDrawProps = {};


        this._connectionInDrawProps.src = objId;
        this._connectionInDrawProps.sCompId = sCompId;
        this._connectionInDrawProps.srcEl = el;
        this._connectionInDrawProps.type = "create";

        this._connectionPath = this.paper.path('M' + this._connectionDesc.x + ',' + this._connectionDesc.y + ' L' + this._connectionDesc.x2 + ',' + this._connectionDesc.y2);

        this._connectionPath.attr(
            {   "stroke-width": this._connectionPathProps.strokeWidth,
                "stroke": this._connectionPathProps.strokeColor,
                "stroke-dasharray": this._connectionPathProps.lineType,
                "arrow-start": this._connectionPathProps.arrowStart,
                "arrow-end": this._connectionPathProps.arrowEnd }
        );

        this.canvas.selectionManager._clearSelection();
    };

    ConnectionDrawingManager.prototype._onMouseMove = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event);

        if (this._connectionInDraw === true) {
            if (this._connectionInDrawProps.type === "reconnect") {
                if (this._connectionRedrawProps.srcDragged === true) {
                    this._connectionDesc.x = mousePos.mX;
                    this._connectionDesc.y = mousePos.mY;
                } else {
                    this._connectionDesc.x2 = mousePos.mX;
                    this._connectionDesc.y2 = mousePos.mY;
                }
            } else {
                this._connectionDesc.x2 = mousePos.mX;
                this._connectionDesc.y2 = mousePos.mY;
            }
            this._drawConnection();
        }
    };

    ConnectionDrawingManager.prototype._endConnectionDraw = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event);

        if (this._connectionInDraw === true) {
            this._connectionDesc.x2 = mousePos.mX;
            this._connectionDesc.y2 = mousePos.mY;
            this._drawConnection();
        }

        this._detachConnectionEndPointHandler(this._connectionInDrawProps.lastAttachedDroppableEl);

        this._connectionInDraw = false;

        this._connectionPath.remove();
        this._connectionPath = undefined;

        this._connectionInDrawProps = undefined;

        this.canvas.endMode(this.canvas.OPERATING_MODES.CREATE_CONNECTION);

        this.logger.debug("Stopped connection drawing");
    };

    ConnectionDrawingManager.prototype._drawConnection = function () {
        var x = this._connectionDesc.x,
            y = this._connectionDesc.y,
            x2 = this._connectionDesc.x2,
            y2 = this._connectionDesc.y2,
            pathDefinition;

        pathDefinition = "M" + x + "," + y + "L" + x2 + "," + y2;

        this._connectionPath.attr({ "path": pathDefinition});
    };

    ConnectionDrawingManager.prototype._connectionEndDrop = function (endPointId, sCompId) {
        this.logger.debug("Connection end dropped on item: '" + endPointId + "', sCompId: '" + sCompId + "'");

        if (this.canvas.mode === this.canvas.OPERATING_MODES.CREATE_CONNECTION) {
            this.canvas.createNewConnection({ "src": this._connectionInDrawProps.src,
                "srcSubCompId": this._connectionInDrawProps.sCompId,
                "dst": endPointId,
                "dstSubCompId": sCompId,
                "metaInfo": this._metaInfo });
        } else if (this.canvas.mode === this.canvas.OPERATING_MODES.RECONNECT_CONNECTION) {
            this.canvas.modifyConnectionEnd({ "id": this._connectionRedrawProps.connId,
                "endPoint": this._connectionRedrawProps.srcDragged === true ? "SOURCE" : "END",
                "endId": endPointId,
                "endSubCompId": sCompId });
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
        var self = this,
            srcEl = srcParams.el,
            srcCoord = srcParams.coord,
            dstEl = dstParams.el,
            dstCoord = dstParams.coord,
            connID = connParams.id,
            connProps = connParams.props;

        //register connection-draw start handler
        srcEl.on(MOUSEDOWN, function (event) {
            event.stopPropagation();
            event.preventDefault();
        });

        dstEl.on(MOUSEDOWN, function (event) {
            event.stopPropagation();
            event.preventDefault();
        });

        srcEl.draggable('destroy');
        srcEl.draggable({
            helper: function () {
                return $("<div class='draw-connection-drag-helper'></div>");
            },
            start: function (event) {
                var el = $(this);
                event.stopPropagation();
                el.addClass(ACCEPT_CLASS);
                self._connectionRedrawProps = { "srcCoord": srcCoord,
                                                "dstCoord": dstCoord,
                                                "srcDragged": true,
                                                "connId": connID,
                                                "connProps": connProps };
                self._startConnectionRedraw();
            },
            stop: function (event) {
                var el = $(this);
                event.stopPropagation();
                self._endConnectionRedraw(event);
                el.removeClass(ACCEPT_CLASS);
            },
            drag: function (event) {
                self._onMouseMove(event);
            }
        });

        dstEl.draggable('destroy');
        dstEl.draggable({
            helper: function () {
                return $("<div class='draw-connection-drag-helper'></div>");
            },
            start: function (event) {
                var el = $(this);
                event.stopPropagation();
                el.addClass(ACCEPT_CLASS);
                self._connectionRedrawProps = { "srcCoord": srcCoord,
                    "dstCoord": dstCoord,
                    "srcDragged": false,
                    "connId": connID,
                    "connProps": connProps };
                self._startConnectionRedraw();
            },
            stop: function (event) {
                var el = $(this);
                event.stopPropagation();
                self._endConnectionRedraw(event);
                el.removeClass(ACCEPT_CLASS);
            },
            drag: function (event) {
                self._onMouseMove(event);
            }
        });

    };

    ConnectionDrawingManager.prototype._startConnectionRedraw = function () {
        this.canvas.beginMode(this.canvas.OPERATING_MODES.RECONNECT_CONNECTION);

        this.logger.debug("Start connection redrawing, connection: '" + this._connectionRedrawProps.connId + "', props: '" + JSON.stringify(this._connectionRedrawProps) + "'");

        this._connectionInDraw = true;
        this._connectionDesc = { "x": this._connectionRedrawProps.srcCoord.x,
            "y": this._connectionRedrawProps.srcCoord.y,
            "x2": this._connectionRedrawProps.dstCoord.x,
            "y2": this._connectionRedrawProps.dstCoord.y };

        this._connectionInDrawProps = {};

        this._connectionInDrawProps.type = "reconnect";

        this._connectionPath = this.paper.path('M' + this._connectionDesc.x + ',' + this._connectionDesc.y + ' L' + this._connectionDesc.x2 + ',' + this._connectionDesc.y2);

        this._connectionPath.attr(
            {   "stroke-width": this._connectionRedrawProps.connProps.width,
                "stroke": IN_DRAW_COLOR,
                "stroke-dasharray": IN_DRAW_LINETYPE,
                "arrow-start": this._connectionRedrawProps.connProps.arrowStart,
                "arrow-end": this._connectionRedrawProps.connProps.arrowEnd }
        );

        this.canvas.selectionManager.hideSelectionOutline();
    };

    ConnectionDrawingManager.prototype._endConnectionRedraw = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event);

        if (this._connectionInDraw === true) {
            if (this._connectionRedrawProps.srcDragged === true) {
                this._connectionDesc.x = mousePos.mX;
                this._connectionDesc.y = mousePos.mY;
            } else {
                this._connectionDesc.x2 = mousePos.mX;
                this._connectionDesc.y2 = mousePos.mY;
            }

            this._drawConnection();
        }

        this._connectionInDraw = false;

        this._connectionPath.remove();
        this._connectionPath = undefined;

        this._connectionInDrawProps = undefined;

        this._connectionRedrawProps = {};
        delete this._connectionRedrawProps;

        this.canvas.endMode(this.canvas.OPERATING_MODES.RECONNECT_CONNECTION);

        this.canvas.selectionManager.showSelectionOutline();

        this.logger.debug("Stopped connection redrawing");
    };

    /********************* END OF - CONNECTION RECONNECT *********************************/

    return ConnectionDrawingManager;
});
