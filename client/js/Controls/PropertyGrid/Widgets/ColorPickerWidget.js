/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
    'js/Controls/ColorPicker'],
    function (WidgetBase,
              ColorPicker) {

        var ColorPickerWidget;

        ColorPickerWidget  = function (propertyDesc) {
            var _self = this;

            ColorPickerWidget.superclass.call(this, propertyDesc);

            this.__colorPicker = new ColorPicker();
            this.__colorPicker.onColorChanged = function (color) {
                _self.setValue(color);
                _self.fireFinishChange();
            };

            this.updateDisplay();

            this.el.append(this.__colorPicker.el);
        };

        ColorPickerWidget.superclass = WidgetBase;

        _.extend(
            ColorPickerWidget.prototype,
            WidgetBase.prototype
        );

        ColorPickerWidget.prototype.updateDisplay =  function () {
            this.__colorPicker.setColor(this.getValue());

            return ColorPickerWidget.superclass.prototype.updateDisplay.call(this);
        };

        ColorPickerWidget.prototype.setReadOnly = function (isReadOnly) {
            ColorPickerWidget.superclass.prototype.setReadOnly.call(this, isReadOnly);

            this.__colorPicker.setEnabled(!isReadOnly);
        };

        return ColorPickerWidget;

    });