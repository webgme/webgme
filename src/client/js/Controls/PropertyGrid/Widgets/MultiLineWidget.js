/*globals define, $*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase',
    'clipboard',
    'js/Dialogs/CodeEditor/CodeEditorDialog'
], function (WidgetBase, Clipboard, CodeEditorDialog) {
    'use strict';

    var MultiLineWidget,
        BTN_DIALOG_OPEN_BASE = $('<a class="btn btn-link btn-sm">edit content</a>');

    MultiLineWidget = function (propertyDesc) {
        var self = this;

        function saving(oked, value) {
            if (oked) {
                self.setValue(value);
            }
            self.fireFinishChange();
        }

        WidgetBase.call(this, propertyDesc);

        this.__btnDialogOpen = BTN_DIALOG_OPEN_BASE.clone();
        this.el.append(this.__btnDialogOpen);

        this.__btnDialogOpen.on('click', function (e) {
            var dialog = new CodeEditorDialog();

            e.stopPropagation();
            e.preventDefault();

            propertyDesc.onHideFn = saving;

            dialog.show(propertyDesc);
        });

        this.updateDisplay();
    };

    MultiLineWidget.prototype = Object.create(WidgetBase.prototype);
    MultiLineWidget.prototype.constructor = MultiLineWidget;

    // MultiLineWidget.prototype.updateDisplay = function () {
    //     return WidgetBase.prototype.updateDisplay.call(this);
    // };

    MultiLineWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this.__btnDialogOpen) {
            if (this._isReadOnly === true) {
                this.__btnDialogOpen.disable(true);
            } else {
                this.__btnDialogOpen.disable(false);
            }
        }
    };

    return MultiLineWidget;

});