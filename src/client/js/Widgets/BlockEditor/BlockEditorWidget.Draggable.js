/*globals define, $*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 *
 */

define([
    'js/DragDrop/DragSource',
    'js/DragDrop/DragHelper',
    'common/util/assert',
    './BlockEditorWidget.Constants'
], function (dragSource, dragHelper, assert, BLOCK_CONSTANTS) {

    'use strict';

    var DEBUG = BLOCK_CONSTANTS.DEBUG,
        BlockEditorWidgetDraggable,
        //DRAG_HELPER_CLASS = 'block-editor-drag-outline',
        //DRAG_HELPER_EL_BASE = $('<div/>', {'class': DRAG_HELPER_CLASS}),
        //DRAG_HELPER_ICON_MOVE = $('<i class="icon-move"></i>'),
        //DRAG_HELPER_ICON_COPY = $('<i class='icon-plus'></i>'),
        DRAG_HELPER_ITEM_ID = BLOCK_CONSTANTS.DRAG_HELPER_ITEM_ID,
        DRAG_HELPER_BUFFER = BLOCK_CONSTANTS.DRAG_HELPER_BUFFER;

    BlockEditorWidgetDraggable = function () {
    };


    BlockEditorWidgetDraggable.prototype._makeDraggable = function (item) {
        var self = this;

        dragSource.makeDraggable(item.$el, {
            'helper': function (event, dragInfo) {
                //Set the cursorAt value
                var element = self._dragHelper(item, event, dragInfo);
                $(this).draggable('option', 'cursorAt', self.getCursorLocation(element, event, item.id));
                return element;
            },
            'drag': function (/*event, ui*/) {
            },
            'dragItems': function (/*el*/) {
                return self.getDragItems(self.selectionManager.getSelectedElements());
            },
            'dragEffects': function (el, event) {
                return self.getDragEffects(self.selectionManager.getSelectedElements(), event);
            },
            'dragParams': function (el, event) {
                return self.getDragParams(self.selectionManager.getSelectedElements(), event);
            },
            'start': function (event, ui) {
                //Set the drop focus
                self.dropFocus = BLOCK_CONSTANTS.BACKGROUND;

                //Start the connection highlight updater
                self.registerDraggingItem(ui.helper);

                var ret = false;
                //enable drag mode only in
                //- DESIGN MODE
                //- if the mousedown is not on a connection drawing start point
                if (self.mode === self.OPERATING_MODES.DESIGN) {
                    //we need to check if the target element is SVGElement or not
                    //because jQuery does not work well on SVGElements
                    if (event.originalEvent.target instanceof SVGElement) {
                        var classDef = event.originalEvent.target.getAttribute('class');
                        if (classDef) {
                            ret = classDef.split(' ').indexOf(BLOCK_CONSTANTS.CONNECTOR_CLASS) === -1;
                        } else {
                            ret = true;
                        }
                    } else {
                        ret = !$(event.originalEvent.target).hasClass(BLOCK_CONSTANTS.CONNECTOR_CLASS);
                    }
                }
                return ret;
            }
        });
    };

    BlockEditorWidgetDraggable.prototype._destroyDraggable = function (item) {
        dragSource.destroyDraggable(item.$el);
    };

    /* OVERWRITE DragSource.prototype.dragHelper */
    BlockEditorWidgetDraggable.prototype._dragHelper = function (item /*, event , dragInfo*/) {
        var firstItem = null,
            items = {},
            draggedItems = $('<div/>', {id: DRAG_HELPER_ITEM_ID}),
            draggedElement = $('<div/>', {id: item.id});

        assert(!item.items, 'Can\'t select multiple items to drag');

        firstItem = item.id;
        items[item.id] = {item: item, z: 100000};

        //Add all the dependent items
        var keys = Object.keys(items),
            deps,
            dependent,
            dragItem;

        while (keys.length) {
            dragItem = items[keys.pop()];
            deps = dragItem.item.getDependents();

            while (deps.length) {
                dependent = deps.pop();
                if (dependent && items[dependent.id] === undefined) {
                    items[dependent.id] = {item: dependent, z: dragItem.z + 1};
                    keys.push(dependent.id);
                }
            }
        }

        //Create a element containing all these
        var itemId,
            itemElement,
            shiftX = item.positionX,
            shiftY = item.positionY,
            box,
            maxX = 0,
            maxY = 0;

        keys = Object.keys(items);
        while (keys.length) {
            itemId = keys.pop();

            //set maxX, maxY
            box = this.items[itemId].getBoundingBox();
            maxX = Math.max(maxX, box.x2);
            maxY = Math.max(maxY, box.y2);

            itemElement = items[itemId].item.$el.clone();
            itemElement.css({
                'position': 'absolute',
                'z-index': items[itemId].z,
                //Shift the element by shiftX, shiftY
                'left': items[itemId].item.positionX - shiftX + 'px',
                'top': items[itemId].item.positionY - shiftY + 'px'
            });

            draggedItems.append(itemElement);
        }

        // Handle the zoom
        var zoom = this._zoomRatio,
            width,
            height;

        draggedItems.css('transform', 'scale(' + zoom + ',' + zoom + ')');

        //Set height, width of the helper
        width = (maxX - item.positionX);
        height = (maxY - item.positionY);

        draggedElement.append(draggedItems);

        draggedItems.css({
            'left': (width * (zoom - 1)) / 2 + DRAG_HELPER_BUFFER,
            'top': (height * (zoom - 1)) / 2 + DRAG_HELPER_BUFFER,
            'position': 'relative',
            'width': width,
            'height': height
        });

        draggedElement.css({
            width: (zoom * width) + 2 * DRAG_HELPER_BUFFER,
            height: (zoom * height) + 2 * DRAG_HELPER_BUFFER
        });

        //DEBUGGING
        if (DEBUG) {
            draggedItems.css('background-color', 'blue');
            draggedItems.css('opacity', '.5');
            draggedElement.css('background-color', 'red');
            draggedElement.css('opacity', '.5');
        }

        return draggedElement;
    };

    /**
     * Calculated the cursor's position on the dragged item.
     *
     * @param {HTML} element
     * @param {Object} event
     * @param {String} itemId
     * @return {Location} Location of the cursor
     */
    BlockEditorWidgetDraggable.prototype.getCursorLocation = function (element, event, itemId) {
        //Get the correct cursor location relative to the div
        var location = {},
            width = element.width() - 2 * DRAG_HELPER_BUFFER,
            height = element.height() - 2 * DRAG_HELPER_BUFFER,
            item = this.items[itemId],
            zoom = this._zoomRatio,
            scaledWidth = width * zoom,
            scaledHeight = height * zoom,
            p1,
            p2,
            mouseX,
            mouseY;

        mouseX = (event.pageX - item.$el.parent().offset().left) / zoom;
        mouseY = (event.pageY - item.$el.parent().offset().top) / zoom;

        // p1 is the relative cursor location with respect to the clicked on item
        p1 = [mouseX - item.positionX, mouseY - item.positionY];

        // p2 is the adjusted p1 wrt zoom
        p2 = [scaledWidth * (p1[0] / width), scaledHeight * (p1[1] / height)];

        location.left = p2[0] + DRAG_HELPER_BUFFER;
        location.top = p2[1] + DRAG_HELPER_BUFFER;

        return location;
    };

    BlockEditorWidgetDraggable.prototype.getDragItems = function (selectedElements) {
        this.logger.warn('BlockEditorWidgetDraggable.getDragItems is not overridden in the controller!!! ' +
        'selectedElements: ' + selectedElements);
        return [];
    };

    BlockEditorWidgetDraggable.prototype.getDragEffects = function (selectedElements, event) {
        var ctrlKey = event.ctrlKey || event.metaKey,
            effects = [dragSource.DRAG_EFFECTS.DRAG_MOVE];

        //by default the drag is a MOVE

        //CTRL key --> copy
        if (ctrlKey) {
            effects = [dragSource.DRAG_EFFECTS.DRAG_COPY];
        }

        return effects;
    };

    BlockEditorWidgetDraggable.prototype.getDragParams = function (selectedElements, event) {
        var params = {'positions': {}},
            i = selectedElements.length,
            itemID,
            mousePos = this.getAdjustedMousePos(event);

        while (i--) {
            itemID = selectedElements[i];
            if (this.itemIds.indexOf(itemID) !== -1) {
                params.positions[itemID] = {
                    'x': this.items[itemID].positionX - mousePos.mX,
                    'y': this.items[itemID].positionY - mousePos.mY
                };
            }
        }

        return params;
    };

    BlockEditorWidgetDraggable.prototype.DRAG_EFFECTS = dragSource.DRAG_EFFECTS;


    return BlockEditorWidgetDraggable;
});
