/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager',
    'clientUtil',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], function (logManager,
                            clientUtil,
                            DiagramDesignerWidgetConstants) {

    var SelectionManager,
        SELECTION_OVERLAP_RATIO = 0.5,
        PATH_SHADOW_ID_PREFIX = "p_",
        SELECTION_OUTLINE_MARGIN = 15,
        SELECTION_OUTLINE_MIN_WIDTH = 100,
        MOUSE_EVENT_POSTFIX = "SelectionManager";

    SelectionManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "SelectionManager"));

        this._diagramDesigner = options ? options.diagramDesigner : null;

        if (this._diagramDesigner === undefined || this._diagramDesigner === null) {
            this.logger.error("Trying to initialize a SelectionManager without a diagramDesigner...");
            throw ("SelectionManager can not be created");
        }

        this._selectedElements = [];
        this._rotationEnabled = true;

        this.logger.debug("SelectionManager ctor finished");
    };

    SelectionManager.prototype.activate = function () {
        this._activateMouseListeners();
    };

    SelectionManager.prototype.deactivate = function () {
        this._deactivateMouseListeners();
        this._clearSelection();
    };

    SelectionManager.prototype._activateMouseListeners = function () {
        //enable SelectionManager specific DOM event listeners
        var self = this;

        //handle mouse down in designer-items
        this.$el.on('mousedown.SelectionManagerItem', 'div.' + DiagramDesignerWidgetConstants.DESIGNER_ITEM_CLASS,  function (event) {
            var itemId = $(this).attr("id");
            if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.READ_ONLY ||
                self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.DESIGN) {
                self._diagramDesigner.onElementMouseDown(itemId);
                self._setSelection([itemId], self._isMultiSelectionModifierKeyPressed(event));
                event.stopPropagation();
                event.preventDefault();
            }
        });

        //handle mouse down in designer-connections
        this.$el.on('mousedown.SelectionManagerConnection', 'path[class="' + DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS +'"]',  function (event) {
            var connId = $(this).attr("id").replace(PATH_SHADOW_ID_PREFIX, "");
            if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.READ_ONLY ||
                self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.DESIGN) {
                self._diagramDesigner.onElementMouseDown(connId);
                self._setSelection([connId], self._isMultiSelectionModifierKeyPressed(event));
                event.stopPropagation();
                event.preventDefault();
            }
        });

        //handle mouse down on background --> start rubberband selection
        this.$el.on('mousedown.SelectionManager', function (event) {
            if (self._diagramDesigner.mode === self._diagramDesigner.OPERATING_MODES.DESIGN) {
                self._onBackgroundMouseDown(event);
            }
        });
    };

    SelectionManager.prototype._deactivateMouseListeners = function () {
        //disable SelectionManager specific DOM event listeners
        this.$el.off('mousedown.SelectionManagerItem', 'div.' + DiagramDesignerWidgetConstants.DESIGNER_ITEM_CLASS);
        this.$el.off('mousedown.SelectionManagerConnection', 'path[class="' + DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS +'"]');
        this.$el.off('mousedown.SelectionManager');
    };

    SelectionManager.prototype.initialize = function (el) {
        var self = this;

        this.$el = el;

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ON_COMPONENT_DELETE, function (__diagramDesigner, componentId) {
            self._onComponentDelete(componentId);
        });
    };

    SelectionManager.prototype.getSelectedElements = function () {
        return this._selectedElements;
    };

    SelectionManager.prototype.clear = function () {
        this._clearSelection();
    };

    SelectionManager.prototype.setSelection = function (idList, addToExistingSelection) {
        this._setSelection(idList, addToExistingSelection);
    };

    SelectionManager.prototype.onSelectionCommandClicked = function (command, selectedIds) {
        this.logger.warning("SelectionManager.prototype.onSelectionCommandClicked IS NOT OVERRIDDEN IN HOST COMPONENT. command: '" + command + "', selectedIds: " + selectedIds);
    };

    SelectionManager.prototype.onSelectionChanged = function (selectedIDs) {
        this.logger.warning("SelectionManager.prototype.onSelectionChanged IS NOT OVERRIDDEN IN HOST COMPONENT. selectedIDs: " + selectedIDs);
    };


    /********************** MULTIPLE SELECTION MODIFIER KEY CHECK ********************/
    SelectionManager.prototype._isMultiSelectionModifierKeyPressed = function (event) {
        return event.ctrlKey || event.metaKey;
    };
    /***************END OF --- MULTIPLE SELECTION MODIFIER KEY CHECK *****************/


    /*********************** RUBBERBAND SELECTION *************************************/

    SelectionManager.prototype._onBackgroundMouseDown = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            self = this,
            leftButton = event.which === 1;

        this.logger.debug("SelectionManager._onBackgroundMouseDown at: " + JSON.stringify(mousePos));

        this._diagramDesigner._registerKeyboardListener();

        if (leftButton === true) {
            //start drawing selection rubber-band
            this._rubberbandSelection = { "x": mousePos.mX,
                "y": mousePos.mY,
                "x2": mousePos.mX,
                "y2": mousePos.mY,
                "addToExistingSelection": this._isMultiSelectionModifierKeyPressed(event)};

            if (this._rubberbandSelection.addToExistingSelection !== true) {
                this._clearSelection();
            }

            this.$rubberBand = this._createRubberBand();

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

    SelectionManager.prototype._createRubberBand = function () {
        //create rubberband DOM element
        var rubberBand = $('<div/>', {
            "class" : "rubberband"
        });
        rubberBand.css({"display": "none",
            "position": "absolute"});

        return rubberBand;
    };

    SelectionManager.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event);

        if (this._rubberbandSelection) {
            this._rubberbandSelection.x2 = mousePos.mX;
            this._rubberbandSelection.y2 = mousePos.mY;
            this._drawSelectionRubberBand();
        }
    };

    SelectionManager.prototype._onBackgroundMouseUp = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            params;

        if (this._rubberbandSelection) {
            //unbind mousemove and mouseup handlers
            $(document).off('mousemove.SelectionManager', this._onBackgroundMouseMoveCallBack);
            $(document).off('mouseup.SelectionManager', this._onBackgroundMouseUpCallBack);

            //delete unnecessary instance members
            delete this._onBackgroundMouseMoveCallBack;
            delete this._onBackgroundMouseUpCallBack;

            //
            this._rubberbandSelection.x2 = mousePos.mX;
            this._rubberbandSelection.y2 = mousePos.mY;

            this._drawSelectionRubberBand();

            params = {"addToExistingSelection": this._rubberbandSelection.addToExistingSelection,
                "x": Math.min(this._rubberbandSelection.x, this._rubberbandSelection.x2),
                "x2": Math.max(this._rubberbandSelection.x, this._rubberbandSelection.x2),
                "y": Math.min(this._rubberbandSelection.y, this._rubberbandSelection.y2),
                "y2": Math.max(this._rubberbandSelection.y, this._rubberbandSelection.y2)};

            this._selectItemsByRubberBand(params);

            //remove rubber-band DOM
            this.$rubberBand.remove();
            this.$rubberBand = null;

            delete this._rubberbandSelection;
        }
    };

    SelectionManager.prototype._drawSelectionRubberBand = function () {
        var minEdgeLength = 2,
            x = Math.min(this._rubberbandSelection.x, this._rubberbandSelection.x2),
            x2 = Math.max(this._rubberbandSelection.x, this._rubberbandSelection.x2),
            y = Math.min(this._rubberbandSelection.y, this._rubberbandSelection.y2),
            y2 = Math.max(this._rubberbandSelection.y, this._rubberbandSelection.y2);

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
            items = this._diagramDesigner.items,
            minRubberBandSize = 10;

        if (rbBBox.x2 - rbBBox.x < minRubberBandSize ||
            rbBBox.y2 - rbBBox.y < minRubberBandSize) {
            //selection area is too small, don't bother with it
            return;
        }

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

        this._setSelection(itemsInSelection, params.addToExistingSelection);
    };

    /*********************** END OF - RUBBERBAND SELECTION *************************************/


    /*********************** CLEAR SELECTION *********************************/
    SelectionManager.prototype._clearSelection = function () {
        var i = this._selectedElements.length,
            itemId,
            items = this._diagramDesigner.items,
            item,
            changed = false;

        while (i--) {
            itemId = this._selectedElements[i];
            item = items[itemId];

            if (item) {
                if ($.isFunction(item.onDeselect)) {
                    item.onDeselect();
                }
            }

            changed = true;
        }

        this._selectedElements = [];

        this.hideSelectionOutline();

        if (changed) {
            this.onSelectionChanged(this._selectedElements);
        }
    };
    /*********************** END OF --- CLEAR SELECTION ****************************/


    /*********************** SET SELECTION *********************************/
    SelectionManager.prototype._setSelection = function (idList, addToExistingSelection) {
        var i,
            len = idList.length,
            item,
            items = this._diagramDesigner.items,
            itemId,
            changed = false;

        this.logger.debug("setSelection: " + idList + ", addToExistingSelection: " + addToExistingSelection);

        if (len > 0) {
            //check if the new selection has to be added to the existing selection
            if (addToExistingSelection === true) {
                //if not in the selection yet, add IDs to the selection

                //first let the already selected items know that they are participating in a multiple selection from now on
                i = this._selectedElements.length;
                while(i--) {
                    item = items[this._selectedElements[i]];

                    if ($.isFunction(item.onDeselect)) {
                        item.onDeselect();
                    }

                    if ($.isFunction(item.onSelect)) {
                        item.onSelect(true);
                    }
                }

                i = idList.length;
                len = idList.length + this._selectedElements.length;

                while (i--) {
                    itemId = idList[i];

                    if (this._selectedElements.indexOf(itemId) === -1) {
                        this._selectedElements.push(itemId);

                        item = items[itemId];

                        if ($.isFunction(item.onSelect)) {
                            item.onSelect(len > 1);
                        }

                        changed = true;
                    }
                }
            } else {
                //the existing selection (if any) has to be cleared out first
                if (idList.length > 1) {
                    this._clearSelection();

                    changed = true;

                    i = idList.length;
                    while(i--) {
                        itemId = idList[i];
                        item = items[itemId];

                        this._selectedElements.push(itemId);

                        if ($.isFunction(item.onSelect)) {
                            item.onSelect(true);
                        }
                    }
                } else {
                    itemId = idList[0];

                    //if not yet in selection
                    if (this._selectedElements.indexOf(itemId) === -1) {
                        this._clearSelection();

                        this._selectedElements.push(itemId);

                        item = items[itemId];

                        if ($.isFunction(item.onSelect)) {
                            item.onSelect(false);
                        }

                        changed = true;
                    }
                }
            }
        }


        this.logger.debug("selected elements: " + this._selectedElements);

        this.showSelectionOutline();

        if (changed) {
            this.onSelectionChanged(this._selectedElements);
        }
    };
    /*********************** END OF --- SET SELECTION *********************************/

    /*********************** COMPONENT DELETE HANDLER *******************/
    SelectionManager.prototype._onComponentDelete = function (componentId) {
        var idx,
            changed = false;

        //items are already deleted, we just need to remove them from the selectedIdList (if there)
        idx = this._selectedElements.indexOf(componentId);
        if (idx !== -1) {
            this._selectedElements.splice(idx, 1);
            changed = true;
        }

        if (changed) {
            this.onSelectionChanged(this._selectedElements);
        }
    };
    /*********************** COMPONENT DELETE HANDLER *******************/

    /*********************** SHOW SELECTION OUTLINE *********************************/
    SelectionManager.prototype.showSelectionOutline = function () {
        var bBox = this._getSelectionBoundingBox(),
            cW = this._diagramDesigner._actualSize.w,
            cH = this._diagramDesigner._actualSize.h;

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

            if (this._diagramDesigner.skinParts.$selectionOutline) {
                this._diagramDesigner.skinParts.$selectionOutline.empty();
            } else {
                this._diagramDesigner.skinParts.$selectionOutline = $('<div/>', {
                    "class" : "selection-outline"
                });

                this._diagramDesigner.skinParts.$itemsContainer.append(this._diagramDesigner.skinParts.$selectionOutline);
            }

            this._diagramDesigner.skinParts.$selectionOutline.css({ "left": bBox.x,
                "top": bBox.y,
                "width": bBox.w,
                "height": bBox.h });

            this._renderSelectionActions();
        } else {
            this.hideSelectionOutline();
        }
    };
    /*********************** END OF --- SHOW SELECTION OUTLINE *********************************/


    /*********************** HIDE SELECTION OUTLINE *********************************/
    SelectionManager.prototype.hideSelectionOutline = function () {
        if (this._diagramDesigner.skinParts.$selectionOutline) {
            this._diagramDesigner.skinParts.$selectionOutline.empty();
            this._diagramDesigner.skinParts.$selectionOutline.remove();
            this._diagramDesigner.skinParts.$selectionOutline = null;
        }
    };
    /*********************** END OF --- HIDE SELECTION OUTLINE *********************************/


    /************* GET SELECTION OUTLINE COORDINATES AND DIMENSIONS ************************/
    SelectionManager.prototype._getSelectionBoundingBox = function () {
        var i = this._selectedElements.length,
            bBox,
            id,
            childBBox,
            items = this._diagramDesigner.items;

        while (i--) {
            id = this._selectedElements[i];

            if (items[id]) {

                if (!bBox) {
                    bBox = { "x": this._diagramDesigner._actualSize.w,
                        "y": this._diagramDesigner._actualSize.h,
                        "x2": 0,
                        "y2": 0};
                }

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
    /************* END OF --- GET SELECTION OUTLINE COORDINATES AND DIMENSIONS ************************/

    /************* RENDER COMMAND BUTTONS ON SELECTION OUTLINE ************************/
    SelectionManager.prototype._renderSelectionActions = function () {
        var self = this,
            deleteBtn;

        if (this._diagramDesigner.getIsReadOnlyMode() === true) {
            return;
        }

        if (this._diagramDesigner.getIsReadOnlyMode() !== true) {
            deleteBtn = $('<div/>', {
                "class" : "s-btn delete",
                "command" : "delete"
            });
            this._diagramDesigner.skinParts.$selectionOutline.append(deleteBtn);
            deleteBtn.html('<i class="icon-remove"></i>');
        }

        //detach mousedown handler on selection outline
        this._diagramDesigner.skinParts.$selectionOutline.off("mousedown").off("click", ".s-btn");
        this._diagramDesigner.skinParts.$selectionOutline.on("mousedown", function (event) {
            event.stopPropagation();
        }).on("click", ".s-btn", function (event) {
            var command = $(this).attr("command");
            self.logger.debug("Selection button clicked with command: '" + command + "'");

            self.onSelectionCommandClicked(command, self._selectedElements);

            event.stopPropagation();
            event.preventDefault();
        });

        this._renderRotateHandlers();
    };
    /************* END OF --- RENDER COMMAND BUTTONS ON SELECTION OUTLINE ************************/

    SelectionManager.prototype._renderRotateHandlers = function () {
        var rotateBtnBottom,
            self = this,
            rotateEnabled = !this._diagramDesigner.getIsReadOnlyMode() && this._rotationEnabled;

        if (rotateEnabled) {
            rotateBtnBottom = $('<div/>', {
                "class" : "s-btn rotate bottom"
            });
            rotateBtnBottom.html('<i class="icon-repeat"></i>');

            this._rotationDegree = $('<div/>', {
                "class" : "rotation-deg"
            });

            this._diagramDesigner.skinParts.$selectionOutline.append(rotateBtnBottom);
            this._diagramDesigner.skinParts.$selectionOutline.append(this._rotationDegree);

            this._diagramDesigner.skinParts.$selectionOutline.off("mousedown." + MOUSE_EVENT_POSTFIX, ".rotate");
            this._diagramDesigner.skinParts.$selectionOutline.on("mousedown." + MOUSE_EVENT_POSTFIX, ".rotate", function (event) {
                var rotateBtn = $(this);
                self.logger.debug("selection rotate button mousedown'");

                self._startSelectionRotate(rotateBtn, event);

                event.stopPropagation();
                event.preventDefault();
            });

            //TODO: 0, 90, 180, 270 fix _getRotationDegree
            /*this._diagramDesigner.skinParts.$selectionOutline.off("dblclick." + MOUSE_EVENT_POSTFIX, ".rotate");
            this._diagramDesigner.skinParts.$selectionOutline.on("dblclick." + MOUSE_EVENT_POSTFIX, ".rotate", function (event) {
                var rotateBtn = $(this);
                self.logger.debug("selection rotate button mousedown'");

                self._startSelectionRotate(rotateBtn, event);

                event.stopPropagation();
                event.preventDefault();
            });*/
        }
    };

    SelectionManager.prototype._startSelectionRotate = function (rotateBtn, event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            self = this,
            leftButton = event.which === 1;

        if (leftButton) {
            this._rotateDesc = {"startX": mousePos.mX,
                                "startY": mousePos.mY,
                                "oX": parseInt(this._diagramDesigner.skinParts.$selectionOutline.css("left"), 10) + parseInt(this._diagramDesigner.skinParts.$selectionOutline.css("width"), 10) / 2,
                                "oY": parseInt(this._diagramDesigner.skinParts.$selectionOutline.css("top"), 10) + parseInt(this._diagramDesigner.skinParts.$selectionOutline.css("height"), 10) / 2,
                                "horizontal": rotateBtn.hasClass('top')};

            $(document).on("mousemove.rotate." + MOUSE_EVENT_POSTFIX, function (event) {
                self._onSelectionRotate(event);
            });
            $(document).on("mouseup.rotate." + MOUSE_EVENT_POSTFIX, function (event) {
                //unbind mousemove and mouseup handlers
                $(document).off("mousemove.rotate." + MOUSE_EVENT_POSTFIX);
                $(document).off("mouseup.rotate." + MOUSE_EVENT_POSTFIX);

                self._endSelectionRotate(event);
            });
        }
    };

    SelectionManager.prototype._onSelectionRotate = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            dx = mousePos.mX - this._rotateDesc.startX,
            dy = mousePos.mY - this._rotateDesc.startY,
            deg = this._getRotationDegree(this._rotateDesc.horizontal ? dx : dy, event.shiftKey);

        this._rotationDegree.html( (deg >= 0 ? "+" : "") + deg + "°");

        this._diagramDesigner.skinParts.$selectionOutline.css({'transform-origin': '50% 50%',
            'transform': 'rotate('+ deg + 'deg)'});
    };

    SelectionManager.prototype._endSelectionRotate = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            dx = mousePos.mX - this._rotateDesc.startX,
            dy = mousePos.mY - this._rotateDesc.startY,
            deg = this._getRotationDegree(this._rotateDesc.horizontal ? dx : dy, event.shiftKey),
            selectedItems = [],
            i = this._selectedElements.length;

        this._rotationDegree.html('');

        this._diagramDesigner.skinParts.$selectionOutline.css({'transform-origin': '50% 50%',
            'transform': 'rotate(0deg)'});

        while (i--) {
            if (this._diagramDesigner.itemIds.indexOf(this._selectedElements[i]) !== -1) {
                selectedItems.push(this._selectedElements[i]);
            }
        }

        if (selectedItems.length > 0) {
            this.onSelectionRotated(deg, selectedItems);
        }
    };

    SelectionManager.prototype._getRotationDegree = function(value, rounded) {
        var val = rounded ? Math.round(value / 10) * 10  : value;

        return Math.floor(val % 360);
    };

    SelectionManager.prototype.onSelectionRotated = function (deg, selectedIds) {
        this.logger.warning("SelectionManager.prototype.onSelectionRotated IS NOT OVERRIDDEN IN HOST COMPONENT. deg: '" + deg + "'deg, selectedIds: " + selectedIds);
    };

    SelectionManager.prototype.enableRotation = function (enabled) {
        if (this._rotationEnabled !== enabled) {
            this._rotationEnabled = enabled;
        }
    };

    return SelectionManager;
});
