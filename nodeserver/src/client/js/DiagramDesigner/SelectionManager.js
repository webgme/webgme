"use strict";

define(['logManager',
    'clientUtil'], function (logManager,
                            clientUtil) {

    var SelectionManager,
        SELECTION_OVERLAP_RATIO = 0.5;

    SelectionManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "SelectionManager"));

        this.canvas = options ? options.canvas : null;

        if (this.canvas === undefined || this.canvas === null) {
            this.logger.error("Trying to initialize a SelectionManager without a canvas...");
            throw ("SelectionManager can not be created");
        }

        this.selectedItemIdList = [];

        this.logger.debug("SelectionManager ctor finished");
    };

    SelectionManager.prototype.initialize = function ($el) {
        var self = this;

        this.$el = $el;

        //hook up mousedown on background
        $el.on('mousedown.SelectionManager', function (event) {
            self._onBackgroundMouseDown(event);
        });
    };

    SelectionManager.prototype._onBackgroundMouseDown = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event),
            self = this,
            leftButton = event.which === 1;

        this.logger.debug("SelectionManager._onBackgroundMouseDown at: " + JSON.stringify(mousePos));

        if (leftButton === true) {
            if (event.ctrlKey || event.metaKey !== true) {
                this._clearSelection();
            }

            //start drawing selection rubberband
            this.rubberbandSelection = { "x": mousePos.mX,
                                            "y": mousePos.mY,
                                            "x2": mousePos.mX,
                                            "y2": mousePos.mY };

            this.$rubberBand = this.createRubberBand();

            this.$el.append(this.$rubberBand);

            //hook up MouseMove and MouseUp
            this._onBackgroundMouseMoveCallBack = function (event) {
                self._onBackgroundMouseMove(event);
            };

            this._onBackgroundMouseUpCallBack = function (event) {
                self._onBackgroundMouseUp(event);
            };

            $(document).on('mousemove.SelectionManager', this._onBackgroundMouseMoveCallBack);
            $(document).on('mouseup.SelectionManager', this._onBackgroundMouseUpCallBack);

            event.stopPropagation();
        }
    };

    SelectionManager.prototype.createRubberBand = function () {
        //create rubberband DOM element
        var rubberBand = $('<div/>', {
            "class" : "rubberband"
        });
        rubberBand.css({"display": "none",
            "position": "absolute"});

        return rubberBand;
    };

    SelectionManager.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event);

        if (this.rubberbandSelection) {
            this.rubberbandSelection.x2 = mousePos.mX;
            this.rubberbandSelection.y2 = mousePos.mY;
            this._drawSelectionRubberBand();
        }
    };

    SelectionManager.prototype._onBackgroundMouseUp = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event),
            params;

        if (this.rubberbandSelection) {
            //unbind mousemove and mouseup handlers
            $(document).off('mousemove.SelectionManager', this._onBackgroundMouseMoveCallBack);
            $(document).off('mouseup.SelectionManager', this._onBackgroundMouseUpCallBack);

            //delete unnecessary instance members
            delete this._onBackgroundMouseMoveCallBack;
            delete this._onBackgroundMouseUpCallBack;

            //
            this.rubberbandSelection.x2 = mousePos.mX;
            this.rubberbandSelection.y2 = mousePos.mY;

            this._drawSelectionRubberBand();

            params = {"ctrlPressed": event.ctrlKey || event.metaKey,
                "x": Math.min(this.rubberbandSelection.x, this.rubberbandSelection.x2),
                "x2": Math.max(this.rubberbandSelection.x, this.rubberbandSelection.x2),
                "y": Math.min(this.rubberbandSelection.y, this.rubberbandSelection.y2),
                "y2": Math.max(this.rubberbandSelection.y, this.rubberbandSelection.y2)};

            this._selectItemsByRubberBand(params);

            //remove rubber-band DOM
            this.$rubberBand.remove();
            this.$rubberBand = null;

            delete this.rubberbandSelection;
        }
    };

    SelectionManager.prototype._clearSelection = function () {
        var i = this.selectedItemIdList.length,
            itemId,
            items = this.canvas.items,
            item;

        while (i--) {
            itemId = this.selectedItemIdList[i];
            item = items[itemId];

            if (item) {
                if ($.isFunction(item.onDeselect)) {
                    item.onDeselect();
                }
            }
        }

        this.selectedItemIdList = [];
    };

    SelectionManager.prototype._drawSelectionRubberBand = function () {
        var minEdgeLength = 2,
            x = Math.min(this.rubberbandSelection.x, this.rubberbandSelection.x2),
            x2 = Math.max(this.rubberbandSelection.x, this.rubberbandSelection.x2),
            y = Math.min(this.rubberbandSelection.y, this.rubberbandSelection.y2),
            y2 = Math.max(this.rubberbandSelection.y, this.rubberbandSelection.y2);

        this.logger.debug('SelectionManager._drawSelectionRubberBand from [' + x + ', ' + y + '] to [' + x2 + ', ' + y2 + ']');

        if (x2 - x < minEdgeLength || y2 - y < minEdgeLength) {
            this.$rubberBand.hide();
        } else {
            this.$rubberBand.show();
        }

        this.$rubberBand.css({"left": x,
            "top": y,
            "width": x2 - x,
            "height": y2 - y});
    };

    SelectionManager.prototype._selectItemsByRubberBand = function (params) {
        var i,
            rbBBox = {  "x":  params.x,
                "y": params.y,
                "x2": params.x2,
                "y2": params.y2 },
            itemsInSelection = [],
            selectionContainsBBox;

        this.logger.debug("Select children by rubber band: [" + rbBBox.x + "," + rbBBox.y + "], [" + rbBBox.x2 + "," + rbBBox.y2 + "]");

        selectionContainsBBox = function (itemBBox) {
            var interSectionRect,
                interSectionRatio;

            if (itemBBox) {
                if (clientUtil.overlap(rbBBox, itemBBox)) {

                    interSectionRect = { "x": Math.max(itemBBox.x, rbBBox.x),
                        "y": Math.max(itemBBox.y, rbBBox.y),
                        "x2": Math.min(itemBBox.x2, rbBBox.x2),
                        "y2": Math.min(itemBBox.y2, rbBBox.y2) };

                    interSectionRatio = (interSectionRect.x2 - interSectionRect.x) * (interSectionRect.y2 - interSectionRect.y) / ((itemBBox.x2 - itemBBox.x) * (itemBBox.y2 - itemBBox.y));

                    if (interSectionRatio > SELECTION_OVERLAP_RATIO) {
                        return true;
                    }
                }
            }

            return false;
        };

        for (i in this.canvas.items) {
            if (this.canvas.items.hasOwnProperty(i)) {
                if (selectionContainsBBox(this.canvas.items[i].getBoundingBox())) {
                    itemsInSelection.push(i);
                }
            }
        }

        if (itemsInSelection.length > 0) {
            this._setSelection(itemsInSelection, params.ctrlPressed);
        }
    };

    return SelectionManager;
});
