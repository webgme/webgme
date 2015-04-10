/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define([
    'js/Controls/PropertyGrid/Widgets/StringWidget',
    'js/Controls/PropertyGrid/Widgets/NumberBoxWidget',
    'js/Controls/PropertyGrid/Widgets/BooleanWidget',
    'js/Controls/PropertyGrid/Widgets/LabelWidget',
    'js/Controls/PropertyGrid/Widgets/iCheckBoxWidget',
    'js/Controls/PropertyGrid/Widgets/OptionWidget',
    'js/Controls/PropertyGrid/Widgets/ColorPickerWidget',
    'js/Utils/ColorUtil',
    'js/Controls/PropertyGrid/Widgets/DialogWidget',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    './PropertyGridWidgets'],
    function (StringWidget,
              NumberBoxWidget,
              BooleanWidget,
              LabelWidget,
              iCheckBoxWidget,
              OptionWidget,
              ColorPickerWidget,
              colorUtil,
              DialogWidget,
              AssetWidget,
              PropertyGridWidgets) {

        "use strict";

        var PropertyGridWidgetManager;

        PropertyGridWidgetManager = function () {
            this._registeredWidgets = {};
        };

        PropertyGridWidgetManager.prototype.getWidgetForProperty = function (propDesc) {
            var _type = propDesc.valueType || typeof propDesc.value,
                _readOnly = propDesc.readOnly === true,
                _isOption = _.isArray(propDesc.valueItems),
                _isColor = colorUtil.isColor(propDesc.value),
                _specificWidget = propDesc.widget,
                _isAsset = _type === 'asset',
                widget;

            if (_readOnly && _type !== 'boolean') {
                widget = new LabelWidget(propDesc);
            } else if (_specificWidget) {
                switch (_specificWidget) {
                    case PropertyGridWidgets.DIALOG_WIDGET:
                        widget = new DialogWidget(propDesc);
                        break;
                    default:
                        widget = new _specificWidget(propDesc);
                        break;
                }
            } else if (_isOption){
                widget = new OptionWidget(propDesc);
            } else if (_isColor) {
                widget = new ColorPickerWidget(propDesc);
            } else {
                if (this._registeredWidgets[_type]) {
                    widget = new this._registeredWidgets[_type](propDesc);
                } else if (_isAsset) {
                    widget = new AssetWidget(propDesc);
                } else if (_type === "number") {
                    widget = new NumberBoxWidget(propDesc);
                } else if (_type === "boolean") {
                    widget = new BooleanWidget(propDesc);
                } else {
                    widget = new StringWidget(propDesc);
                }
            }

            widget.setReadOnly(_readOnly);

            return widget;
        };

        PropertyGridWidgetManager.prototype.registerWidgetForType = function (type, widget) {
            if (typeof  widget === 'string') {
                switch (widget) {
                    case 'iCheckBox':
                        this.registerWidgetForType(type, iCheckBoxWidget);
                        break;
                }
            } else {
                this._registeredWidgets[type] = widget;
            }
        };

        return PropertyGridWidgetManager;

    });