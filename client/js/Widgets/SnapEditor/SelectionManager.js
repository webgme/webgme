/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['logManager',
        'clientUtil',
        './SnapEditorWidget.Constants'], function (logManager,
                                                   clientUtil,
                                                   SnapEditorWidgetConstants) {

    "use strict";

    var SelectionManager,
        SELECTION_OVERLAP_RATIO = 0.5,
        SELECTION_OUTLINE_MARGIN = 15,
        SELECTION_OUTLINE_MIN_WIDTH = 100,
        MOUSE_EVENT_POSTFIX = "SelectionManager";

    SelectionManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "SelectionManager"));

        this._snapEditor = options ? options.snapEditor : null;

        if (this._snapEditor === undefined || this._snapEditor === null) {
            this.logger.error("Trying to initialize a SelectionManager without a snapEditor...");
            throw ("SelectionManager can not be created");
        }

        this._selectedElement = null;
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

        this._snapEditor.onItemMouseDown = function (itemId, eventDetails) {
            if (self._snapEditor.mode === self._snapEditor.OPERATING_MODES.READ_ONLY ||
                self._snapEditor.mode === self._snapEditor.OPERATING_MODES.DESIGN) {
                self._setSelection(itemId, false);
                //self._setSelection([itemId], self._isMultiSelectionModifierKeyPressed(eventDetails));
            }
        };

        this._snapEditor.onBackgroundMouseDown = function (eventDetails) {
            if (self._snapEditor.mode === self._snapEditor.OPERATING_MODES.READ_ONLY ||
                self._snapEditor.mode === self._snapEditor.OPERATING_MODES.DESIGN) {
                self._onBackgroundMouseDown(eventDetails);
            }
        };
    };

    SelectionManager.prototype._deactivateMouseListeners = function () {
        this._snapEditor.onItemMouseDown = undefined;
        this._snapEditor.onConnectionMouseDown = undefined;
        this._snapEditor.onBackgroundMouseDown = undefined;
    };

    SelectionManager.prototype.initialize = function (el) {
        var self = this;

        this.$el = el;

        this._snapEditor.addEventListener(this._snapEditor.events.ON_COMPONENT_DELETE, function (__snapEditor, componentId) {
            self._onComponentDelete(componentId);
        });
    };

    SelectionManager.prototype.getSelectedElements = function () {
        //DragInfo calls this and requires an array
        return [this._selectedElement];
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
        //Clear the current selection
        this._clearSelection();


        //Rubber band has been disabled
        /*
        var mousePos = {'mX': event.mouseX, 'mY': event.mouseY},
            self = this,
            leftButton = event.rightClick !== true;

        this.logger.debug("SelectionManager._onBackgroundMouseDown at: " + JSON.stringify(mousePos));

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
            this._snapEditor.trackMouseMoveMouseUp(
                function (event) {
                    self._onBackgroundMouseMove(event);
                },
                function (event) {
                    self._onBackgroundMouseUp(event);
                }
            );
        }
       */
    };

    var RUBBERBAND_BASE = $('<div/>', {"class" : "rubberband"});
    SelectionManager.prototype._createRubberBand = function () {
        //create rubberband DOM element
        var rubberBand = RUBBERBAND_BASE.clone();
        rubberBand.css({"display": "none",
            "position": "absolute"});

        return rubberBand;
    };

    SelectionManager.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = {'mX': event.mouseX, 'mY': event.mouseY};

        if (this._rubberbandSelection) {
            this._rubberbandSelection.x2 = mousePos.mX;
            this._rubberbandSelection.y2 = mousePos.mY;
            this._drawSelectionRubberBand();
        }
    };

    SelectionManager.prototype._onBackgroundMouseUp = function (event) {
        var mousePos = {'mX': event.mouseX, 'mY': event.mouseY},
            params;

        if (this._rubberbandSelection) {
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
        var keys,
            i,
            rbBBox = {  "x":  params.x,
                "y": params.y,
                "x2": params.x2,
                "y2": params.y2 },
            itemsInSelection = [],
            selectionContainsBBox,
            items = this._snapEditor.items,
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

        keys = Object.keys(items);
        while(keys.length){
            i = keys.pop();
            if (selectionContainsBBox(items[i].getBoundingBox())) {
                itemsInSelection.push(i);
            }
        }

        this._setSelection(itemsInSelection, params.addToExistingSelection);
    };

    /*********************** END OF - RUBBERBAND SELECTION *************************************/


    /*********************** CLEAR SELECTION *********************************/
    SelectionManager.prototype._clearSelection = function () {
        var itemId,
            items = this._snapEditor.items,
            item,
            changed = false;

        if (this._selectedElement) {
            item = items[this._selectedElement];

            if (item) {
                if ($.isFunction(item.onDeselect)) {
                    item.onDeselect();
                }
            }

            changed = true;
        }

        this._selectedElement = null;

        this.hideSelectionOutline();

        if (changed) {
            this.onSelectionChanged(this._selectedElement);
        }
    };
    /*********************** END OF --- CLEAR SELECTION ****************************/


    /*********************** SET SELECTION *********************************/
    SelectionManager.prototype._setSelection = function (id) {
        var i,
            item,
            items = this._snapEditor.items,
            itemId,
            changed = false;

        this.logger.debug("setSelection: " + id);

        if(this._selectedElement !== id){
            changed = true;
        }

        if(this._selectedElement){
            item = items[this._selectedElement];
            if ($.isFunction(item.onDeselect)) {
                item.onDeselect();
            }
        }

        if(id){
            this._selectedElement = id;
            item = items[this._selectedElement];

            if ($.isFunction(item.onSelect)) {
                item.onSelect(true);
            }
        }
        /*
         if (id) {
            //check if the new selection has to be added to the existing selection
            if (addToExistingSelection === true) {
                //if not in the selection yet, add IDs to the selection

                //first let the already selected items know that they are participating in a multiple selection from now on
                if (this._selectedElement) {
                    item = items[this._selectedElement];

                    if ($.isFunction(item.onDeselect)) {
                        item.onDeselect();
                    }

                    if ($.isFunction(item.onSelect)) {
                        item.onSelect(true);
                    }
                }

                i = idList.length;
                len = idList.length + this._selectedElement.length;

                while (i--) {
                    itemId = idList[i];

                    if (this._selectedElement.indexOf(itemId) === -1) {
                        this._selectedElement.push(itemId);

                        item = items[itemId];

                        if ($.isFunction(item.onSelect)) {
                            item.onSelect(len > 1);
                        }

                        changed = true;
                    } else {
                        var idx = this._selectedElement.indexOf(itemId);
                        this._selectedElement.splice(idx, 1);

                        item = items[itemId];

                        if ($.isFunction(item.onDeselect)) {
                            item.onDeselect();
                        }

                        changed = true;
                    }
                }

                if (this._selectedElement.length === 1) {
                    item = items[this._selectedElement[0]];
                    if ($.isFunction(item.onSelect)) {
                        item.onSelect(false);
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

                        this._selectedElement.push(itemId);

                        if ($.isFunction(item.onSelect)) {
                            item.onSelect(true);
                        }
                    }
                } else {
                    itemId = idList[0];

                    //if not yet in selection
                    if (this._selectedElement.indexOf(itemId) === -1) {
                        this._clearSelection();

                        this._selectedElement.push(itemId);

                        item = items[itemId];

                        if ($.isFunction(item.onSelect)) {
                            item.onSelect(false);
                        }

                        changed = true;
                    }
                }
            }
        }


        this.logger.debug("selected elements: " + this._selectedElement);
       */

        this.showSelectionOutline();

        if (changed) {
            this.onSelectionChanged(this._selectedElement);
        }
    };
    /*********************** END OF --- SET SELECTION *********************************/

    /*********************** COMPONENT DELETE HANDLER *******************/
    SelectionManager.prototype._onComponentDelete = function (componentId) {
        //items are already deleted, we just need to remove them from the selectedIdList (if there)
        if (componentId === this._selectedElement){
            this._selectedElement = null;
            this.onSelectionChanged(this._selectedElement);
        }

    };
    /*********************** COMPONENT DELETE HANDLER *******************/

    /*********************** SHOW SELECTION OUTLINE *********************************/
    var SELECTION_OUTLINE_BASE = $('<div/>', {
        "class" : "selection-outline"
    });
    SelectionManager.prototype.showSelectionOutline = function () {
        var bBox = this._getSelectionBoundingBox(),
            cW = this._snapEditor._actualSize.w,
            cH = this._snapEditor._actualSize.h;

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

            if (this._snapEditor.skinParts.$selectionOutline) {
                this._snapEditor.skinParts.$selectionOutline.empty();
            } else {
                this._snapEditor.skinParts.$selectionOutline = SELECTION_OUTLINE_BASE.clone();

                this._snapEditor.skinParts.$itemsContainer.append(this._snapEditor.skinParts.$selectionOutline);
            }

            this._snapEditor.skinParts.$selectionOutline.css({ "left": bBox.x,
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
        if (this._snapEditor.skinParts.$selectionOutline) {
            this._snapEditor.skinParts.$selectionOutline.empty();
            this._snapEditor.skinParts.$selectionOutline.remove();
            this._snapEditor.skinParts.$selectionOutline = null;
        }
    };
    /*********************** END OF --- HIDE SELECTION OUTLINE *********************************/


    /************* GET SELECTION OUTLINE COORDINATES AND DIMENSIONS ************************/
    SelectionManager.prototype._getSelectionBoundingBox = function () {
        var bBox,
            id,
            child,
            childBBox,
            items = this._snapEditor.items;

        if (this._selectedElement) {
            id = this._selectedElement;

            if (items[id]) {

                if (!bBox) {
                    bBox = { "x": this._snapEditor._actualSize.w,
                        "y": this._snapEditor._actualSize.h,
                        "x2": 0,
                        "y2": 0};
                }

                child = items[id];
                while(child){//Create the box from box and all 'next' pointers
                    childBBox = child.getBoundingBox();

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

                    child = child.getNextItem();
                }
            }
        }

        return bBox;
    };
    /************* END OF --- GET SELECTION OUTLINE COORDINATES AND DIMENSIONS ************************/

    /************* RENDER COMMAND BUTTONS ON SELECTION OUTLINE ************************/
    var DELETE_BUTTON_BASE = $('<div/>', {
        "class" : "s-btn delete",
        "command" : "delete"
    });
    DELETE_BUTTON_BASE.html('<i class="icon-remove"></i>');

    var CONTEXT_MENU_BUTTON_BASE = $('<div/>', {
        "class" : "s-btn contextmenu",
        "command" : "contextmenu"
    });
    CONTEXT_MENU_BUTTON_BASE.html('<i class="icon-list-alt"></i>');

    var MOVE_BUTTON_BASE = $('<div/>', {
        "class" : "s-btn move",
        "command" : "move"
    });
    MOVE_BUTTON_BASE.html('<i class="icon-move"></i>');

    SelectionManager.prototype._renderSelectionActions = function () {
        var self = this,
            deleteBtn,
            contextMenuBtn,
            moveBtn;

        if (this._snapEditor.getIsReadOnlyMode() === true) {
            return;
        }

        if (this._snapEditor.getIsReadOnlyMode() !== true) {
            deleteBtn = DELETE_BUTTON_BASE.clone();
            this._snapEditor.skinParts.$selectionOutline.append(deleteBtn);

            moveBtn = MOVE_BUTTON_BASE.clone();
            this._snapEditor.skinParts.$selectionOutline.append(moveBtn);
            this._snapEditor._makeDraggable({ 'items': this._selectedElement, '$el': moveBtn });
        }

        //context menu
        contextMenuBtn = CONTEXT_MENU_BUTTON_BASE.clone();
        this._snapEditor.skinParts.$selectionOutline.append(contextMenuBtn);

        //detach mousedown handler on selection outline
        this._snapEditor.skinParts.$selectionOutline.off("mousedown").off("click", ".s-btn");
        this._snapEditor.skinParts.$selectionOutline.on("mousedown", function (event) {
            event.stopPropagation();
        }).on("click", ".s-btn", function (event) {
            var command = $(this).attr("command");
            self.logger.debug("Selection button clicked with command: '" + command + "'");

            self.onSelectionCommandClicked(command, self._selectedElement, event);

            event.stopPropagation();
            event.preventDefault();
        });

    };
    /************* END OF --- RENDER COMMAND BUTTONS ON SELECTION OUTLINE ************************/

    return SelectionManager;
});
