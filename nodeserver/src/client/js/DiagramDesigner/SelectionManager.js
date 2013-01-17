"use strict";

define(['logManager',
    'clientUtil'], function (logManager,
                            clientUtil) {

    var SelectionManager,
        SELECTION_OVERLAP_RATIO = 0.5,
        DESIGNER_CONNECTION_CLASS = "designer-connection", //TODO: need a common constants file
        PATH_SHADOW_ID_PREFIX = "p_",
        DESIGNER_ITEM_CLASS = "designer-item",
        SELECTION_OUTLINE_MARGIN = 15,
        SELECTION_OUTLINE_MIN_WIDTH = 100;

    SelectionManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "SelectionManager"));

        this.canvas = options ? options.canvas : null;

        if (this.canvas === undefined || this.canvas === null) {
            this.logger.error("Trying to initialize a SelectionManager without a canvas...");
            throw ("SelectionManager can not be created");
        }

        this.selectedItemIdList = [];

        this.allowRubberBandSelection = true;
        this.allowSelection = true;
        this.allowMultiSelection = true;

        this.logger.debug("SelectionManager ctor finished");
    };

    SelectionManager.prototype.initialize = function ($el) {
        var self = this;

        this.$el = $el;

        $el.on('mousedown.SelectionManagerItem', 'div.' + DESIGNER_ITEM_CLASS,  function (event) {
            var itemId = $(this).attr("id");
            self.canvas.onItemMouseDown(event, itemId);
            event.stopPropagation();
            event.preventDefault();
        });

        $el.on('mousedown.SelectionManagerConnection', 'path[class="' + DESIGNER_CONNECTION_CLASS +'"]',  function (event) {
            var itemId = $(this).attr("id").replace(PATH_SHADOW_ID_PREFIX, "");
            self.canvas.onConnectionMouseDown(event, itemId);
            event.stopPropagation();
            event.preventDefault();
        });

        if (this.allowRubberBandSelection === true) {
            //hook up mousedown on background
            $el.on('mousedown.SelectionManager', function (event) {
                if (self.canvas.mode === self.canvas.OPERATING_MODES.READ_ONLY ||
                    self.canvas.mode === self.canvas.OPERATING_MODES.NORMAL) {
                    self._onBackgroundMouseDown(event);
                }
            });
        }
    };

    /*********************** RUBBERBAND SELECTION *************************************/

    SelectionManager.prototype._onBackgroundMouseDown = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event),
            self = this,
            leftButton = event.which === 1;

        this.logger.debug("SelectionManager._onBackgroundMouseDown at: " + JSON.stringify(mousePos));

        if (leftButton === true) {

            this.canvas.beginMode(this.canvas.OPERATING_MODES.RUBBERBAND_SELECTION);

            if ((event.ctrlKey || event.metaKey) !== true) {
                this._clearSelection();
            }

            //start drawing selection rubber-band
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

            params = {"event": event,
                "x": Math.min(this.rubberbandSelection.x, this.rubberbandSelection.x2),
                "x2": Math.max(this.rubberbandSelection.x, this.rubberbandSelection.x2),
                "y": Math.min(this.rubberbandSelection.y, this.rubberbandSelection.y2),
                "y2": Math.max(this.rubberbandSelection.y, this.rubberbandSelection.y2)};

            this._selectItemsByRubberBand(params);

            //remove rubber-band DOM
            this.$rubberBand.remove();
            this.$rubberBand = null;

            delete this.rubberbandSelection;

            this.canvas.endMode(this.canvas.OPERATING_MODES.RUBBERBAND_SELECTION);
        }
    };

    SelectionManager.prototype._drawSelectionRubberBand = function () {
        var minEdgeLength = 2,
            x = Math.min(this.rubberbandSelection.x, this.rubberbandSelection.x2),
            x2 = Math.max(this.rubberbandSelection.x, this.rubberbandSelection.x2),
            y = Math.min(this.rubberbandSelection.y, this.rubberbandSelection.y2),
            y2 = Math.max(this.rubberbandSelection.y, this.rubberbandSelection.y2);

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
            selectionContainsBBox,
            items = this.canvas.items;

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

        for (i in items) {
            if (items.hasOwnProperty(i)) {
                if (selectionContainsBBox(items[i].getBoundingBox())) {
                    itemsInSelection.push(i);
                }
            }
        }

        if (itemsInSelection.length > 0) {
            this.setSelection(itemsInSelection, params.event);
        }
    };

    /*********************** END OF - RUBBERBAND SELECTION *************************************/

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

        this.hideSelectionOutline();
    };

    SelectionManager.prototype.setSelection = function (idList, event) {
        var i,
            multiSelectionModifier = event ? event.ctrlKey || event.metaKey : false,
            len = idList.length,
            item,
            items = this.canvas.items,
            itemId;

        this.logger.debug("setSelection: " + idList + ", multiSelectionModifier: " + multiSelectionModifier);

        if (this.allowSelection !== true) {
            this.logger.debug("Selection of items are not allowed...");
        } else {
            if (len > 0) {

                //if multiple selection is not allowed for any reason
                // - clear current selection
                // - keep the first item from the list since only 1 item can be selected
                if (this.allowMultiSelection !== true) {
                    this._clearSelection();
                    idList.splice(0, len - 1);
                } else {
                    //by definition multiselection is allowed
                    //check if user pressed the necessary modifier keys for multiselection
                    if (multiSelectionModifier === true) {
                        //if not in the selection yet, add IDs to the selection

                        //first let the already selected items know that they are participating in a multiple selection from now on
                        i = this.selectedItemIdList.length;
                        while(i--) {
                            item = items[this.selectedItemIdList[i]];

                            if ($.isFunction(item.onDeselect)) {
                                item.onDeselect();
                            }

                            if ($.isFunction(item.onSelect)) {
                                item.onSelect(true);
                            }
                        }

                        i = idList.length;
                        len = idList.length + this.selectedItemIdList.length;

                        while (i--) {
                            itemId = idList[i];

                            if (this.selectedItemIdList.indexOf(itemId) === -1) {
                                this.selectedItemIdList.push(itemId);

                                item = items[itemId];

                                if ($.isFunction(item.onSelect)) {
                                    item.onSelect(len > 1);
                                }

                                if (idList.length === 1) {
                                    this._lastSelected = idList[0];
                                }
                            }
                        }
                    } else {
                        //multiselection modifier key is not pressed
                        if (idList.length > 1) {
                            this._clearSelection();

                            i = idList.length;
                            while(i--) {
                                itemId = idList[i];
                                item = items[itemId];

                                this.selectedItemIdList.push(itemId);

                                if ($.isFunction(item.onSelect)) {
                                    item.onSelect(true);
                                }
                            }
                        } else {
                            itemId = idList[0];

                            //if not yet in selection
                            if (this.selectedItemIdList.indexOf(itemId) === -1) {
                                this._clearSelection();

                                this.selectedItemIdList.push(itemId);

                                item = items[itemId];

                                if ($.isFunction(item.onSelect)) {
                                    item.onSelect(false);
                                }
                            }
                        }
                    }
                }
            }
        }

        this.logger.debug("selected items: " + this.selectedItemIdList);

        this.showSelectionOutline();
    };

    SelectionManager.prototype.componentsDeleted = function (idList) {
        var i = idList.length,
            idx,
            id;

        //items are already deleted, we just need to remove them from the selectedIdList (if there)
        while (i--) {
            id = idList[i];
            idx = this.selectedItemIdList.indexOf(id);
            if (idx !== -1) {
                this.selectedItemIdList.splice(idx, 1);
            }
        }
    };

    SelectionManager.prototype.showSelectionOutline = function () {
        var bBox = this._getSelectionBoundingBox(),
            cW = this.canvas._actualSize.w,
            cH = this.canvas._actualSize.h;

        if (bBox && bBox.hasOwnProperty("x")) {

            bBox.x -= SELECTION_OUTLINE_MARGIN;
            bBox.y -= SELECTION_OUTLINE_MARGIN;
            bBox.x2 += SELECTION_OUTLINE_MARGIN;
            bBox.y2 += SELECTION_OUTLINE_MARGIN;

            if (bBox.x < 0) {
                bBox.x = 0;
            }

            if (bBox.y < 0) {
                bBox.y = 0;
            }

            if (bBox.x2 > cW) {
                bBox.x2 = cW;
            }

            if (bBox.y2 > cH) {
                bBox.y2 = cH;
            }

            bBox.w = bBox.x2 - bBox.x;
            bBox.h = bBox.y2 - bBox.y;
            if (bBox.w < SELECTION_OUTLINE_MIN_WIDTH) {
                bBox.x -= (SELECTION_OUTLINE_MIN_WIDTH - bBox.w) / 2;
                bBox.x2 += (SELECTION_OUTLINE_MIN_WIDTH - bBox.w) / 2;
                bBox.w = bBox.x2 - bBox.x;
            }

            if (this.canvas.skinParts.$selectionOutline) {
                this.canvas.skinParts.$selectionOutline.empty();
            } else {
                this.canvas.skinParts.$selectionOutline = $('<div/>', {
                    "class" : "selection-outline"
                });

                this.canvas.skinParts.$itemsContainer.append(this.canvas.skinParts.$selectionOutline);
            }

            this.canvas.skinParts.$selectionOutline.css({ "left": bBox.x,
                "top": bBox.y,
                "width": bBox.w,
                "height": bBox.h });

            //in non-readonly mode show action options on selection outline
            if (this.canvas.getIsReadOnlyMode() === false) {
                this._renderSelectionActions();
            }
        } else {
            this.hideSelectionOutline();
        }
    };

    SelectionManager.prototype.hideSelectionOutline = function () {
        if (this.canvas.skinParts.$selectionOutline) {
            this.canvas.skinParts.$selectionOutline.empty();
            this.canvas.skinParts.$selectionOutline.remove();
            this.canvas.skinParts.$selectionOutline = null;
        }
    };

    SelectionManager.prototype._getSelectionBoundingBox = function () {
        var i = this.selectedItemIdList.length,
            bBox,
            id,
            childBBox,
            items = this.canvas.items;

        if (i === 0) {
           bBox = {};
        } else {
            /*bBox = { "x": this.canvas._actualSize.w,
                "y": this.canvas._actualSize.h,
                "x2": 0,
                "y2": 0};*/
        }

        while (i--) {
            id = this.selectedItemIdList[i];

            if (items[id]) {

                bBox = bBox || { "x": this.canvas._actualSize.w,
                    "y": this.canvas._actualSize.h,
                    "x2": 0,
                    "y2": 0};

                childBBox = items[id].getBoundingBox();

                if (childBBox.x < bBox.x) {
                    bBox.x = childBBox.x;
                }
                if (childBBox.y < bBox.y) {
                    bBox.y = childBBox.y;
                }
                if (childBBox.x2 > bBox.x2) {
                    bBox.x2 = childBBox.x2;
                }
                if (childBBox.y2 > bBox.y2) {
                    bBox.y2 = childBBox.y2;
                }
            }
        }

        return bBox;
    };

    SelectionManager.prototype._renderSelectionActions = function () {
        var self = this,
            deleteBtn;

        deleteBtn = $('<div/>', {
            "class" : "s-btn delete",
            "data-id" : "delete"
        });
        this.canvas.skinParts.$selectionOutline.append(deleteBtn);

        /*this._skinParts.copySelection = $('<div/>', {
            "class" : "copySelectionBtn selectionBtn"
        });
        this._skinParts.selectionOutline.append(this._skinParts.copySelection);*/

        this.canvas.skinParts.$selectionOutline.on("mousedown", function (event) {
            event.stopPropagation();
        }).on("click", ".s-btn", function (event) {
            var dataId = $(this).attr("data-id");
            self.logger.debug("Selection button clicked with data-id: '" + dataId + "'");

            switch (dataId) {
                case "delete":
                    self.onSelectionDeleteClicked(self.selectedItemIdList);
                    break;
                default:
            }

            event.stopPropagation();
            event.preventDefault();
        });
    };

    SelectionManager.prototype.onSelectionDeleteClicked = function (selectedIds) {
        //NOTE: overridden in DesignerCanvas
    };

    return SelectionManager;
});
