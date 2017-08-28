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

    var MultilineWidget,
        BTN_DIALOG_OPEN_BASE = $('<a class="btn btn-link btn-sm">Edit content ...</a>');

    MultilineWidget = function (propertyDesc) {
        var self = this;

        function saving(oked, value) {
            if (oked) {
                self.setValue(value);
            }
            self.fireFinishChange();
        }

        WidgetBase.call(this, propertyDesc);

        this._readOnly = false;
        this.__btnDialogOpen = BTN_DIALOG_OPEN_BASE.clone();
        this.__btnDialogOpen.css({
            'font-size': '11px',
            'color': '#3160ab',
            'padding-left': '0',
            'padding-right': '0'
        });

        this.el.append(this.__btnDialogOpen);

        this.__btnDialogOpen.on('click', function (e) {
            var dialog = new CodeEditorDialog();

            e.stopPropagation();
            e.preventDefault();

            propertyDesc.readOnly = self._readOnly;
            propertyDesc.title = 'Edit Attribute "' + propertyDesc.name + '"';

            dialog.show(propertyDesc);
        });

        this.updateDisplay();
    };

    MultilineWidget.prototype = Object.create(WidgetBase.prototype);
    MultilineWidget.prototype.constructor = MultilineWidget;

    // MultilineWidget.prototype.updateDisplay = function () {
    //     return WidgetBase.prototype.updateDisplay.call(this);
    // };

    MultilineWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        this._readOnly = isReadOnly;
        if (isReadOnly) {
            this.__btnDialogOpen.text('View content ...');
        } else {
            this.__btnDialogOpen.text('Edit content ...');
        }
    };

    return MultilineWidget;

});