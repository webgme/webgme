/*globals define, $*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'], function (WidgetBase) {

    'use strict';

    var FloatWidget,
        INPUT_BASE = $('<input/>', {type: 'text'});

    FloatWidget = function (propertyDesc) {
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

        this._input.on('change', function (/* e */) {
            self._onChange();
        });

        this._input.on('blur', function (/* e */) {
            self._onBlur();
        });

        this._input.on('keydown', function (e) {
            if (e.keyCode === 13) {
                self._onBlur();
            }
        });

        this.el.append(this._input);
    };

    FloatWidget.prototype = Object.create(WidgetBase.prototype);
    FloatWidget.prototype.constructor = FloatWidget;

    FloatWidget.prototype.setValue = function (v) {
        WidgetBase.prototype.setValue.call(this, v);
        this.updateDisplay();
        return this;
    };

    FloatWidget.prototype._onChange = function () {
        var currentVal = parseFloat(this._input.val());
        this.setValue(currentVal);
    };

    FloatWidget.prototype._onBlur = function () {
        this._onChange();
        this.fireFinishChange();
    };

    FloatWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (isReadOnly === true) {
            this._input.attr('disabled', 'disabled');
        } else {
            this._input.removeAttr('disabled');
        }
    };

    FloatWidget.prototype.destroy = function () {
        this._input.off('change');
        this._input.off('blur');
        this._input.off('keydown');
        WidgetBase.prototype.destroy.call(this);
    };

    return FloatWidget;

});