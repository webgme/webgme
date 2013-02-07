"use strict";

define([
    'js/PropertyEditor/Widgets/StringWidget',
    'js/PropertyEditor/Widgets/NumberBoxWidget',
    'js/PropertyEditor/Widgets/BooleanWidget'
],
    function (StringWidget,
              NumberBoxWidget,
              BooleanWidget) {

        var WidgetManager;

        WidgetManager = function () {

        };

        WidgetManager.prototype.getWidgetForProperty = function (propDesc) {
            var _type = propDesc.valueType || typeof propDesc.value;

            if (_type === "number") {
                return new NumberBoxWidget(propDesc);
            } else if (_type === "boolean") {
                return new BooleanWidget(propDesc);
            } else {
                return new StringWidget(propDesc);
            }
        };

        return WidgetManager;

    });