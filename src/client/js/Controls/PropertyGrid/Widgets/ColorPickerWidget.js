/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase',
    'js/Controls/ColorPicker'
], function (WidgetBase,
             ColorPicker) {

    'use strict';

    var ColorPickerWidget,
        DIV_BASE = $('<div/>', {
            id: 'cpw',
            class: 'color-picker'
        });

    ColorPickerWidget = function (propertyDesc) {
        var self = this,
            c,
            colorPicker;

        this._enabled = true;

        WidgetBase.call(this, propertyDesc);

        this.__colorDiv = DIV_BASE.clone();

        this.__colorDiv.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (self._enabled) {
                c = self.getValue();

                colorPicker = new ColorPicker({el: self.__colorDiv, color: c});
                colorPicker.onColorChanged = function (color) {
                    self.setValue(color);
                    self.fireFinishChange();
                };
            }
        });

        this.updateDisplay();

        this.el.append(this.__colorDiv);
    };

    ColorPickerWidget.prototype = Object.create(WidgetBase.prototype);
    ColorPickerWidget.prototype.constructor = ColorPickerWidget;

    ColorPickerWidget.prototype.updateDisplay = function () {
        this.__colorDiv.css('background-color', this.getValue());

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    ColorPickerWidget.prototype.setReadOnly = function (isReadOnly) {

        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        this._enabled = !this._isReadOnly;
    };

    return ColorPickerWidget;

});