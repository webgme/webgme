"use strict";

define([
    'js/PropertyGrid/Widgets/StringWidget',
    'js/PropertyGrid/Widgets/NumberBoxWidget',
    'js/PropertyGrid/Widgets/BooleanWidget',
    'js/PropertyGrid/Widgets/LabelWidget',
    'js/PropertyGrid/Widgets/iCheckBoxWidget'],
    function (StringWidget,
              NumberBoxWidget,
              BooleanWidget,
              LabelWidget,
              iCheckBoxWidget) {

        var WidgetManager;

        WidgetManager = function () {
            this._registeredWidgets = {};
        };

        WidgetManager.prototype.getWidgetForProperty = function (propDesc) {
            var _type = propDesc.valueType || typeof propDesc.value,
                _readOnly = propDesc.readOnly === true ?  true : false;

            if (_readOnly) {
                return new LabelWidget(propDesc);
            } else {
                if (this._registeredWidgets[_type]) {
                    return new this._registeredWidgets[_type](propDesc);
                } else if (_type === "number") {
                    return new NumberBoxWidget(propDesc);
                } else if (_type === "boolean") {
                    return new BooleanWidget(propDesc);
                } else {
                    return new StringWidget(propDesc);
                }
            }
        };

        WidgetManager.prototype.registerWidgetForType = function (type, widget) {
            if (typeof  widget === 'string') {
                switch (widget) {
                    case 'iCheckBox':
                        this.registerWidgetForType(type, iCheckBoxWidget);
                };
            } else {
                this._registeredWidgets[type] = widget;
            }
        };

        return WidgetManager;

    });