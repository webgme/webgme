/*globals define, $*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'], function (WidgetBase) {

    'use strict';

    var IntegerWidget,
        INPUT_BASE = $('<input/>', {type: 'number', step: '1'});

    IntegerWidget = function (propertyDesc) {
        var self = this,
            attr;

        WidgetBase.call(this, propertyDesc);

        this._input = INPUT_BASE.clone();

        this._input.val(propertyDesc.value);

        if (typeof propertyDesc.minValue === 'number') {
            attr = {};
            attr.min = propertyDesc.minValue;
        }

        if (typeof propertyDesc.maxValue === 'number') {
            attr = attr || {};
            attr.max = propertyDesc.maxValue;
        }

        if (attr) {
            this._input.attr(attr);
        }

        this._input.on('change', function (/* e */) {
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

        this.el.append(this._input);
    };

    IntegerWidget.prototype = Object.create(WidgetBase.prototype);
    IntegerWidget.prototype.constructor = IntegerWidget;

    IntegerWidget.prototype.setValue = function (v) {

        WidgetBase.prototype.setValue.call(this, v);
        this.updateDisplay();
        return this;
    };

    IntegerWidget.prototype._onChange = function () {
        var currentVal = this._input.val();
        currentVal = parseFloat(currentVal);

        if (isNaN(currentVal)) {
            this._input.val(this.getValue());
        } else {
            this.setValue(Math.round(currentVal));
        }
    };

    IntegerWidget.prototype._onBlur = function () {
        this._onChange();
        this.fireFinishChange();
    };

    IntegerWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this._input.attr('disabled', 'disabled');
        } else {
            this._input.removeAttr('disabled');
        }
    };

    IntegerWidget.prototype.destroy = function () {
        this._input.off('change');
        this._input.off('blur');
        this._input.off('keydown');
        WidgetBase.prototype.destroy.call(this);
    };

    return IntegerWidget;

});