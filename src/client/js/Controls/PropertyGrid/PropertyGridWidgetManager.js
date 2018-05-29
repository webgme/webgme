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
    'js/Controls/PropertyGrid/Widgets/FloatWidget',
    'js/Controls/PropertyGrid/Widgets/IntegerWidget',
    'js/Controls/PropertyGrid/Widgets/PointerWidget',
    'js/Controls/PropertyGrid/Widgets/MetaTypeWidget',
    'js/Controls/PropertyGrid/Widgets/MultiSelectWidget',
    'js/Controls/PropertyGrid/Widgets/SvgSelectWidget',
    'js/Controls/PropertyGrid/Widgets/MultilineWidget',
    'js/Controls/PropertyGrid/Widgets/SortableWidget',
    'js/Controls/PropertyGrid/Widgets/RangeWidget',
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
             FloatWidget,
             IntegerWidget,
             PointerWidget,
             MetaTypeWidget,
             MultiSelectWidget,
             SvgSelectWidget,
             MultilineWidget,
             SortableWidget,
             RangeWidget,
             PROPERTY_GRID_WIDGETS) {

    'use strict';

    var PropertyGridWidgetManager;

    PropertyGridWidgetManager = function () {
        this._registeredWidgets = {};
    };

    PropertyGridWidgetManager.prototype.getWidgetForProperty = function (propDesc) {
        var type = propDesc.valueType || typeof propDesc.value,
            readOnly = propDesc.readOnly === true,
            isSortable = type.toLowerCase() == 'sortable',
            isOption = _.isArray(propDesc.valueItems) && !isSortable,
            isColor = colorUtil.isColor(propDesc.value),
            specificWidget = propDesc.widget,
            widget;

        if (propDesc.multiline) {
            specificWidget = PROPERTY_GRID_WIDGETS.MULTILINE;
        }

        if (typeof propDesc.increment === 'number' &&
            typeof propDesc.minValue === 'number' &&
            typeof propDesc.maxValue === 'number') {
            specificWidget = PROPERTY_GRID_WIDGETS.RANGE_WIDGET;
        }

        if (readOnly && type !== 'boolean' && type !== 'asset') {
            widget = new LabelWidget(propDesc);
        } else if (specificWidget) {
            switch (specificWidget) {
                case PROPERTY_GRID_WIDGETS.DIALOG_WIDGET:
                    widget = new DialogWidget(propDesc);
                    break;
                case PROPERTY_GRID_WIDGETS.META_TYPE_WIDGET:
                    widget = new MetaTypeWidget(propDesc);
                    break;
                case PROPERTY_GRID_WIDGETS.POINTER_WIDGET:
                    widget = new PointerWidget(propDesc);
                    break;
                case PROPERTY_GRID_WIDGETS.MULTI_SELECT_WIDGET:
                    widget = new MultiSelectWidget(propDesc);
                    break;
                case PROPERTY_GRID_WIDGETS.COLOR_PICKER:
                    widget = new ColorPickerWidget(propDesc);
                    break;
                case PROPERTY_GRID_WIDGETS.SVG_SELECT:
                    widget = new SvgSelectWidget(propDesc);
                    break;
                case PROPERTY_GRID_WIDGETS.MULTILINE:
                    widget = new MultilineWidget(propDesc);
                    break;
                case PROPERTY_GRID_WIDGETS.RANGE_WIDGET:
                    widget = new RangeWidget(propDesc);
                    break;
                default:
                    widget = new specificWidget(propDesc);
                    break;
            }
        } else if (isOption) {
            widget = new OptionWidget(propDesc);
        } else if (isSortable) {
            widget = new SortableWidget(propDesc);
        } else if (isColor) {
            widget = new ColorPickerWidget(propDesc);
        } else if (type === 'asset') {
            widget = new AssetWidget(propDesc);
        } else if (type === 'float') {
            widget = new FloatWidget(propDesc);
        } else if (type === 'integer') {
            widget = new IntegerWidget(propDesc);
        } else {
            if (this._registeredWidgets[type]) {
                widget = new this._registeredWidgets[type](propDesc);
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
