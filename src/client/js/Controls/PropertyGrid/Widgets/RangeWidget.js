/*globals define, $*/
/**
 * Range Widget for editing numerical values within a range and a specific increment.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'], function (WidgetBase) {

    'use strict';

    var INPUT_BASE = $('<input/>', {type: 'range', class: 'range-widget-input'});

    function RangeWidget(propertyDesc) {
        var self = this,
            attr = {};

        WidgetBase.call(this, propertyDesc);

        this._widgetContainer = $('<div>');
        this._label = $('<div>', {text: this.propertyValue, class: 'range-widget-label'});
        this._input = INPUT_BASE.clone();

        if (typeof propertyDesc.minValue === 'number') {
            attr.min = propertyDesc.minValue;
        }

        if (typeof propertyDesc.maxValue === 'number') {
            attr.max = propertyDesc.maxValue;
        }

        if (typeof propertyDesc.increment === 'number') {
            attr.step = propertyDesc.increment;
        }

        this._input.attr(attr);

        this._input.val(this.propertyValue);

        this._input.on('change click', function (/* e */) {
            self._onChange();
        });

        this._input.on('blur', function (/* e */) {
            self._onBlur();
        });

        this._input.on('keydown', function (e) {
            if (e.keyCode === 13) {
                this.blur();
            }
        });

        this._widgetContainer.append(this._label);
        this._widgetContainer.append(this._input);

        this.el.append(this._widgetContainer);
    }

    RangeWidget.prototype = Object.create(WidgetBase.prototype);
    RangeWidget.prototype.constructor = RangeWidget;

    RangeWidget.prototype.setValue = function (v) {

        WidgetBase.prototype.setValue.call(this, v);
        this.updateDisplay();
        return this;
    };

    RangeWidget.prototype._onChange = function () {
        var currentVal = this._input.val();
        currentVal = parseFloat(currentVal);

        if (isNaN(currentVal)) {
            this._input.val(this.getValue());
            this._label.text(this.getValue());
        } else {
            this.setValue(currentVal);
            this._label.text(currentVal);
        }
    };

    RangeWidget.prototype._onBlur = function () {
        this._onChange();
        this.fireFinishChange();
    };

    RangeWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this._input.attr('disabled', 'disabled');
        } else {
            this._input.removeAttr('disabled');
        }
    };

    RangeWidget.prototype.destroy = function () {
        this._input.off('change');
        this._input.off('blur');
        this._input.off('keydown');
        WidgetBase.prototype.destroy.call(this);
    };

    RangeWidget.prototype.focus = function () {
        this._input.focus();
    };

    return RangeWidget;
});