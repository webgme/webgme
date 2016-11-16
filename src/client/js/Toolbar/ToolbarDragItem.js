/*globals define, $, _*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    './ButtonBase',
    './ToolbarItemBase',
    'js/DragDrop/DragSource'
], function (buttonBase,
             ToolbarItemBase,
             dragSource) {

    'use strict';

    function ToolbarDragItem(params) {
        this.el = $('<div class="toolbar-drag-item"></div>');
        this._dragBtn = buttonBase.createButton(params);

        dragSource.makeDraggable(this.el, params);

        this.el.append(this._dragBtn);
    };

    _.extend(ToolbarDragItem.prototype, ToolbarItemBase.prototype);

    ToolbarDragItem.prototype.enabled = function (enabled) {
        this._dragBtn.enabled(enabled);
        dragSource.enableDraggable(this.el, enabled);
    };

    ToolbarDragItem.prototype.destroy = function () {
        dragSource.destroyDraggable(this.el);
        ToolbarItemBase.prototype.destroy.call(this);
    }

    return ToolbarDragItem;
});