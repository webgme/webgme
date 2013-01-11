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
        HOVER_CLASS = 'connection-end-state-hover';

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

        this._connectionType = "connection";

        this._connectionPathProps = { "strokeWidth" : 2,
            "strokeColor" : "#FF7800",
            "lineType": "-",
            "arrowStart": "none",
            "arrowEnd": "none" };

        this.canvas.addBeginModeHandler(this.canvas.OPERATING_MODES.CREATE_CONNECTION, this._modeCREATE_CONNECTIONBeginHandler);
    };

    ConnectionDrawingManager.prototype.attachConnectable = function (elements, objId) {
        if (this._connectionInDraw === true) {
            this._attachConnectionEndPointHandler(elements, objId);
        } else {
            this._attachConnectionSourcePointHandler(elements, objId);
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

    ConnectionDrawingManager.prototype._attachConnectionSourcePointHandler = function (elements, objId) {
        var self = this;

        if (elements && elements.length > 0) {
            //register connection-draw start handler
            elements.on(MOUSEDOWN, function (event) {
                event.stopPropagation();
                event.preventDefault();
            });
            elements.draggable('destroy');
            elements.draggable({
                refreshPositions: true,
                helper: function () {
                    return $("<div class='draw-connection-drag-helper'></div>");
                },
                start: function (event) {
                    var el = $(this);
                    event.stopPropagation();
                    el.addClass(ACCEPT_CLASS);
                    self._startConnectionDraw(el, objId);
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

    ConnectionDrawingManager.prototype._attachConnectionEndPointHandler = function (elements, objId) {
        var self = this,
            droppableEl = elements.not(this._connectionInDrawProps.srcEl);

        if (droppableEl && droppableEl.length > 0) {
            /*droppableEl.droppable('destroy');
            droppableEl.droppable({
                accept: '.' + ACCEPT_CLASS,
                greedy: true,
                drop: function (event, ui) {
                    self.logger.error("dropped on: " + objId);

                    //remove event handlers
                    self._detachConnectionEndPointHandler(droppableEl);

                    //stop event propagation
                    event.stopPropagation();
                }
            });*/
            droppableEl.on(MOUSEENTER, function (event) {
                //TODO: more complex 'OK' function needs to be provided
                $(this).addClass(HOVER_CLASS);
            }).on(MOUSELEAVE, function (event) {
                $(this).removeClass(HOVER_CLASS);
            }).on(MOUSEUP, function (event) {
                self._detachConnectionEndPointHandler(droppableEl);
                self._connectionEndDrop(objId);
            });

            this._connectionInDrawProps.lastAttachedDroppableEl = droppableEl;
        }
    };

    ConnectionDrawingManager.prototype._startConnectionDraw = function (el, objId) {
        var itemBBox = this.canvas.items[objId].getBoundingBox();

        this.canvas.beginMode(this.canvas.OPERATING_MODES.CREATE_CONNECTION);

        this.logger.error("Start connection drawing. SRCID: " + objId);

        this._connectionInDraw = true;
        this._connectionDesc = { "x": itemBBox.x + itemBBox.width / 2,
                                 "y": itemBBox.y + itemBBox.height / 2,
                                 "x2": itemBBox.x + itemBBox.width / 2,
                                 "y2": itemBBox.y + itemBBox.height / 2 };

        this._connectionInDrawProps = {};


        this._connectionInDrawProps.src = objId;
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
    };

    ConnectionDrawingManager.prototype._onMouseMove = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event);

        if (this._connectionInDraw === true) {
            this._connectionDesc.x2 = mousePos.mX;
            this._connectionDesc.y2 = mousePos.mY;
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

        this.logger.error("Stopped connection drawing");
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

    ConnectionDrawingManager.prototype._connectionEndDrop = function (endPointId) {
        this.logger.error("MOUSEUP: " + endPointId);

        if (this.canvas.mode === this.canvas.OPERATING_MODES.CREATE_CONNECTION) {
            this.canvas.createNewConnection({ "src": this._connectionInDrawProps.src,
                                           "dst": endPointId,
                                           "type": this._connectionType });
        }
    };

    ConnectionDrawingManager.prototype.setConnectionInDrawProperties = function (params) {
        if (params.connectionType) {
            this._connectionType = params.connectionType;
        }

        this._connectionPathProps.strokeWidth = params.width || this._connectionPathProps.strokeWidth;

        this._connectionPathProps.strokeColor = params.color || this._connectionPathProps.strokeColor;
        this._connectionPathProps.arrowStart = params.arrowStart || this._connectionPathProps.arrowStart;
        this._connectionPathProps.arrowEnd = params.arrowEnd || this._connectionPathProps.arrowEnd;
    };

    /********************** CONCRETE MODE CHANGE HANDLERS *************************/
    ConnectionDrawingManager.prototype._modeCREATE_CONNECTIONBeginHandler = function () {
        //'this' will be DesignerCanvas
        this.selectionManager._clearSelection();
    };

    return ConnectionDrawingManager;
});
