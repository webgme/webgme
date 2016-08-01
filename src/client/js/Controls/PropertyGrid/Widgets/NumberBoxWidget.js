/*globals define, _, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/PropertyGrid/Widgets/NumberWidgetBase'], function (NumberWidgetBase) {

    'use strict';

    var NumberBoxWidget,
        INPUT_BASE = $('<input/>', {type: 'text'});

    NumberBoxWidget = function (propertyDesc) {
        var self = this;

        this.__truncationSuspended = false;

        NumberWidgetBase.call(this, propertyDesc);

        this.__input = INPUT_BASE.clone();
        this.__input.val(this.propertyValue);

        // Makes it so manually specified values are not truncated.

        this.__input.on('change', function (/* e */) {
            self._onChange();
        });
        this.__input.on('blur', function (/* e */) {
            self._onBlur();
        });

        this.__input.on('keydown', function (e) {
            // When pressing entire, you can be as precise as you want.
            if (e.keyCode === 13) {
                self.__truncationSuspended = true;
                this.blur();
                self.__truncationSuspended = false;
            }
        });

        this.updateDisplay();

        this.el.append(this.__input);
    };

    NumberBoxWidget.prototype = Object.create(NumberWidgetBase.prototype);
    NumberBoxWidget.prototype.constructor = NumberBoxWidget;

    /*OVERRIDE INHERITED PROPERTIES*/

    NumberBoxWidget.prototype.updateDisplay = function () {
        var val = this.__truncationSuspended ?
            this.getValue() :
            this._roundToDecimal(this.getValue(), this.__precision);

        this.__input.val(val);
        return NumberWidgetBase.prototype.updateDisplay.call(this);
    };

    /*DEFINE CUSTOM PROPERTIES*/
    NumberBoxWidget.prototype._roundToDecimal = function (value, decimals) {
        var tenTo = Math.pow(10, decimals);
        if (value === '') {
            return value;
        }
        return Math.round(value * tenTo) / tenTo;
    };

    NumberBoxWidget.prototype._onChange = function () {
        var attempted = parseFloat(this.__input.val());
        if (_.isNaN(attempted)) {
            this.__input.val(this.originalValue);
        } else {
            this.setValue(attempted);
        }
    };

    NumberBoxWidget.prototype._onBlur = function () {
        this._onChange();
        this.fireFinishChange();
    };

    NumberBoxWidget.prototype.setReadOnly = function (isReadOnly) {
        NumberWidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this.__input.attr('disabled', 'disabled');
        } else {
            this.__input.removeAttr('disabled');
        }
    };

    return NumberBoxWidget;
});

