/*globals define, WebGMEGlobal, _, $ */
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase',
    './PointerWidget'
], function (WidgetBase, PointerWidget) {

    'use strict';

    var MetaTypeWidget;

    MetaTypeWidget = function (propertyDesc) {
        var self = this,
            activeNode,
            activeSelection;

        this._gmeNodeId = null;
        this.USE_ACTUAL_POINTER_NAME = true;

        WidgetBase.call(this, propertyDesc);

        activeSelection = WebGMEGlobal.State.getActiveSelection();
        activeNode = WebGMEGlobal.State.getActiveObject();
        if (activeSelection && activeSelection.length > 0) {
            if (activeSelection.length === 1) {
                this._gmeNodeId = activeSelection[0];
            }
        } else if (activeNode) {
            this._gmeNodeId = activeNode;
        }

        this._client = propertyDesc.client;

        this._div = $('<div/>', {class: 'ptr-widget'});
        this.el.append(this._div);

        this.__label = $('<span/>', {class: 'user-select-on'});
        this._div.append(this.__label);

        this.__label.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            self._followPointer();
        });

        this.updateDisplay();
    };

    _.extend(MetaTypeWidget.prototype, PointerWidget.prototype);

    MetaTypeWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);
    };

    return MetaTypeWidget;

});
