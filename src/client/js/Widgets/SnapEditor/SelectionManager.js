/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['logManager',
        'clientUtil'], function (logManager,
                                 clientUtil) {

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

        this._snapEditor.addEventListener(this._snapEditor.events.ON_COMPONENT_DELETE, function (snapEditor, componentId) {
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

    SelectionManager.prototype._onBackgroundMouseDown = function (/*event*/) {
        //Clear the current selection
        this._clearSelection();
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


    /*********************** CLEAR SELECTION *********************************/
    SelectionManager.prototype._clearSelection = function () {
        var items = this._snapEditor.items,
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
        var item,
            items = this._snapEditor.items,
            changed = false;

        this.logger.debug("setSelection: " + id);

        if(this._selectedElement !== id){
            changed = true;
        }

        if(this._selectedElement){
            item = items[this._selectedElement];
            if (item && $.isFunction(item.onDeselect)) {
                item.onDeselect();
            }
        }

        if(id){
            this._selectedElement = id;
            item = items[this._selectedElement];

            if (item && $.isFunction(item.onSelect)) {
                item.onSelect(true);
            }
        }
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
    
    DELETE_BUTTON_BASE.html('<i class="glyphicon glyphicon-remove"></i>');


    SelectionManager.prototype._renderSelectionActions = function () {
        var deleteBtn,
            self = this;

        if (this._snapEditor.getIsReadOnlyMode() !== true) {
            deleteBtn = DELETE_BUTTON_BASE.clone();
            this._snapEditor.skinParts.$selectionOutline.append(deleteBtn);
        }

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
