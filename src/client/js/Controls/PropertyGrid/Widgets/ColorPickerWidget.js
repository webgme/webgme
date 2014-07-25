/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
    'js/Controls/ColorPicker'],
    function (WidgetBase,
              ColorPicker) {

        "use strict";

        var ColorPickerWidget,
            DIV_BASE = $('<div/>', {'id': 'cpw',
                'class': 'color-picker'});

        ColorPickerWidget  = function (propertyDesc) {
            var _self = this;

            this._enabled = true;

            ColorPickerWidget.superclass.call(this, propertyDesc);

            this.__colorDiv = DIV_BASE.clone();

            this.__colorDiv.on('click', function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (_self._enabled) {
                    var c = _self.getValue();

                    var _colorPicker = new ColorPicker({'el': _self.__colorDiv, 'color': c});
                    _colorPicker.onColorChanged = function (color) {
                        _self.setValue(color);
                        _self.fireFinishChange();
                    };
                }
            });

            this.updateDisplay();

            this.el.append(this.__colorDiv);
        };

        ColorPickerWidget.superclass = WidgetBase;

        _.extend(
            ColorPickerWidget.prototype,
            WidgetBase.prototype
        );

        ColorPickerWidget.prototype.updateDisplay =  function () {
            this.__colorDiv.css('background-color', this.getValue());

            return ColorPickerWidget.superclass.prototype.updateDisplay.call(this);
        };

        ColorPickerWidget.prototype.setReadOnly = function (isReadOnly) {

            ColorPickerWidget.superclass.prototype.setReadOnly.call(this, isReadOnly);

            this._enabled = !isReadOnly;
        };

        return ColorPickerWidget;

    });