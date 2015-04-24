/*globals define, _ */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

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
    './PropertyGridWidgets'
], function (StringWidget,
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

    'use strict';

    var PropertyGridWidgetManager;

    PropertyGridWidgetManager = function () {
        this._registeredWidgets = {};
    };

    PropertyGridWidgetManager.prototype.getWidgetForProperty = function (propDesc) {
        var type = propDesc.valueType || typeof propDesc.value,
            readOnly = propDesc.readOnly === true,
            isOption = _.isArray(propDesc.valueItems),
            isColor = colorUtil.isColor(propDesc.value),
            SpecificWidget = propDesc.widget,
            isAsset = type === 'asset',
            widget;

        if (readOnly && type !== 'boolean') {
            widget = new LabelWidget(propDesc);
        } else if (SpecificWidget) {
            switch (SpecificWidget) {
                case PropertyGridWidgets.DIALOG_WIDGET:
                    widget = new DialogWidget(propDesc);
                    break;
                default:
                    widget = new SpecificWidget(propDesc);
                    break;
            }
        } else if (isOption) {
            widget = new OptionWidget(propDesc);
        } else if (isColor) {
            widget = new ColorPickerWidget(propDesc);
        } else {
            if (this._registeredWidgets[type]) {
                widget = new this._registeredWidgets[type](propDesc);
            } else if (isAsset) {
                widget = new AssetWidget(propDesc);
            } else if (type === 'number') {
                widget = new NumberBoxWidget(propDesc);
            } else if (type === 'boolean') {
                widget = new BooleanWidget(propDesc);
            } else {
                widget = new StringWidget(propDesc);
            }
        }

        widget.setReadOnly(readOnly);

        return widget;
    };

    PropertyGridWidgetManager.prototype.registerWidgetForType = function (type, widget) {
        if (typeof widget === 'string') {
            switch (widget) {
                case 'iCheckBox':
                    this.registerWidgetForType(type, iCheckBoxWidget);
                    break;
                default:
                    break;
            }
        } else {
            this._registeredWidgets[type] = widget;
        }
    };

    return PropertyGridWidgetManager;

});