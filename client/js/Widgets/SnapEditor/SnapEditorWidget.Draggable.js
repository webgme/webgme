/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define(['js/DragDrop/DragSource',
        'js/DragDrop/DragHelper',
        './SnapEditorWidget.Constants'], function (dragSource,
                                                   dragHelper,
                                                   SnapEditorWidgetConstants) {

    var SnapEditorWidgetDraggable,
        DRAG_HELPER_CLASS = 'diagram-designer-drag-outline',
        DRAG_HELPER_EL_BASE = $('<div/>', {'class': DRAG_HELPER_CLASS}),
        DRAG_HELPER_ICON_MOVE = $('<i class="icon-move"></i>'),
        DRAG_HELPER_ICON_COPY = $('<i class="icon-plus"></i>'),
        DRAG_HELPER_BUFFER = 15;

    SnapEditorWidgetDraggable = function () {
    };


    SnapEditorWidgetDraggable.prototype._makeDraggable = function (item) {
        var self = this;

        dragSource.makeDraggable(item.$el, {
            'helper': function (event, dragInfo) {
                return self._dragHelper(item, event, dragInfo);
            },
            'cursorAt': self._getCursorLocation(),//TODO
            'drag': function(event, ui){
            },
            'dragItems': function (el) {
                return self.getDragItems(self.selectionManager.getSelectedElements());
            },
            'dragEffects': function (el, event) {
                return self.getDragEffects(self.selectionManager.getSelectedElements(), event);
            },
            'dragParams': function (el, event) {
                return self.getDragParams(self.selectionManager.getSelectedElements(), event);
            },
            'start': function (event) {
                //Remove ptrs into item
                self.dropFocus = SnapEditorWidgetConstants.BACKGROUND;
                //Remove droppable functionality from dependents of selected stuff
                /*
                var selectedItems = item.getDependents();
                selectedItems.push(item);

                while (selectedItems.length){
                    selectedItems.pop().$el.droppable("disable");
                }
                */

                //TODO Remove this functionality from here...
                //item.disconnectPtrs(SnapEditorWidgetConstants.CONN_ACCEPTING);

                var ret = false;
                //enable drag mode only in
                //- DESIGN MODE
                //- if the mousedown is not on a connection drawing start point
                if (self.mode === self.OPERATING_MODES.DESIGN) {
                    //we need to check if the target element is SVGElement or not
                    //because jQuery does not work well on SVGElements
                    if (event.originalEvent.target instanceof SVGElement) {
                        var classDef = event.originalEvent.target.getAttribute("class");
                        if (classDef) {
                            ret = classDef.split(' ').indexOf(SnapEditorWidgetConstants.CONNECTOR_CLASS) === -1;
                        } else {
                            ret = true;
                        }
                    } else {
                        ret = !$(event.originalEvent.target).hasClass(SnapEditorWidgetConstants.CONNECTOR_CLASS);
                    }
                }
                return ret;
            }
        });
    };

    SnapEditorWidgetDraggable.prototype._destroyDraggable = function (item) {
        dragSource.destroyDraggable(item.$el);
    };

    /* OVERWRITE DragSource.prototype.dragHelper */
    SnapEditorWidgetDraggable.prototype._dragHelper = function (item, event, dragInfo) {
        var firstItem = null,
            items = {},
            i,
            dragElement = $('<div/>', {'id': item.id });

        if(!item.items){
            firstItem = item.id;
            items[item.id] = { item: item, z: 100000 };

        }else{//set of items are selected
            i = item.items.length;
            while(i--){
                items[item.items[i].getId()] = { item: item.items[i], z: 100000 };
            }
        }

        //Add all the dependent items
        var keys = Object.keys(items),
            deps,
            dependent,
            dragItem;

        while(keys.length){
            dragItem = items[keys.pop()];
            deps = dragItem.item.getDependents();

            while(deps.length){
                dependent = deps.pop();
                if(dependent && items[dependent.id] === undefined){
                    items[dependent.id] = { item: dependent, z: dragItem.z + 1 };
                    keys.push(dependent.id);
                }
            }
        }

        //Create a element containing all these
        var itemId,
            itemElement,
            shiftX,
            shiftY,
            x,
            y;

        //Fix cursor alignment
        shiftX = event.pageX - item.$el.parent().offset().left;
        shiftY = event.pageY - item.$el.parent().offset().top;

        keys = Object.keys(items);
        while(keys.length){
            itemId = keys.pop();
            itemElement = items[itemId].item.$el.clone();
            itemElement.css({"position": "absolute",
                             "z-index": items[itemId].z,
                             //Shift the element by shiftX, shiftY
                             "left": items[itemId].item.positionX - shiftX + "px",
                             "top": items[itemId].item.positionY - shiftY + "px"});

            dragElement.append(itemElement);
        }
        return dragElement;
    };

    SnapEditorWidgetDraggable.prototype.getDragItems = function (selectedElements) {
        this.logger.warning("SnapEditorWidgetDraggable.getDragItems is not overridden in the controller!!! selectedElements: " + selectedElements);
        return [];
    };

    SnapEditorWidgetDraggable.prototype.getDragEffects = function (selectedElements, event) {
        var ctrlKey = event.ctrlKey || event.metaKey,
            effects = [dragSource.DRAG_EFFECTS.DRAG_MOVE];

        //by default the drag is a MOVE

        //CTRL key --> copy
        if (ctrlKey) {
            effects = [dragSource.DRAG_EFFECTS.DRAG_COPY];
        }

        return effects;
    };

    SnapEditorWidgetDraggable.prototype.getDragParams = function (selectedElements, event) {
        var params = { 'positions': {}},
            i = selectedElements.length,
            itemID,
            selectionBBox = this.selectionManager._getSelectionBoundingBox(),
            mousePos = this.getAdjustedMousePos(event);

        while (i--) {
            itemID = selectedElements[i];
            if (this.itemIds.indexOf(itemID) !== -1) {
                params.positions[itemID] = {'x': this.items[itemID].positionX - mousePos.mX,
                                     'y': this.items[itemID].positionY - mousePos.mY};
            }
        }

        return params;
    };

    SnapEditorWidgetDraggable.prototype.DRAG_EFFECTS = dragSource.DRAG_EFFECTS;



    return SnapEditorWidgetDraggable;
});
