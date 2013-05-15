"use strict";

define([
    'js/Controls/PropertyGrid/Widgets/StringWidget',
    'js/Controls/PropertyGrid/Widgets/NumberBoxWidget',
    'js/Controls/PropertyGrid/Widgets/BooleanWidget',
    'js/Controls/PropertyGrid/Widgets/LabelWidget',
    'js/Controls/PropertyGrid/Widgets/iCheckBoxWidget',
    'js/Controls/PropertyGrid/Widgets/OptionWidget'],
    function (StringWidget,
              NumberBoxWidget,
              BooleanWidget,
              LabelWidget,
              iCheckBoxWidget,
              OptionWidget) {

        var PropertyGridWidgetManager;

        PropertyGridWidgetManager = function () {
            this._registeredWidgets = {};
        };

        PropertyGridWidgetManager.prototype.getWidgetForProperty = function (propDesc) {
            var _type = propDesc.valueType || typeof propDesc.value,
                _readOnly = propDesc.readOnly === true ?  true : false,
                _isOption = _.isArray(propDesc.valueItems);

            if (_readOnly) {
                return new LabelWidget(propDesc);
            } else if (_isOption){
                return new OptionWidget(propDesc);
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

        PropertyGridWidgetManager.prototype.registerWidgetForType = function (type, widget) {
            if (typeof  widget === 'string') {
                switch (widget) {
                    case 'iCheckBox':
                        this.registerWidgetForType(type, iCheckBoxWidget);
                };
            } else {
                this._registeredWidgets[type] = widget;
            }
        };

        return PropertyGridWidgetManager;

    });