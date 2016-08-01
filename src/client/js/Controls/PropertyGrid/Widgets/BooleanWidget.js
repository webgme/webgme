/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define(['js/Controls/PropertyGrid/Widgets/WidgetBase'], function (WidgetBase) {

    'use strict';

    var BooleanWidget,
        CHECKBOX_BASE = $('<input/>', {type: 'checkbox'});

    BooleanWidget = function (propertyDesc) {
        var self = this;

        WidgetBase.call(this, propertyDesc);

        this.__checkbox = CHECKBOX_BASE.clone();
        this.__checkbox.prop('checked', this.propertyValue);

        this.__checkbox.on('change', function (/* e */) {
            self.setValue($(this).is(':checked'));
            self.fireFinishChange();
        });

        this.updateDisplay();

        this.el.append(this.__checkbox);
    };

    BooleanWidget.prototype = Object.create(WidgetBase.prototype);
    BooleanWidget.prototype.constructor = BooleanWidget;

    BooleanWidget.prototype.updateDisplay = function () {

        if (this.getValue() === true) {
            this.__checkbox.attr('checked', true);
        } else {
            this.__checkbox.attr('checked', false);
        }

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    BooleanWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this.__checkbox.attr('disabled', 'disabled');
        } else {
            this.__checkbox.removeAttr('disabled');
        }
    };

    return BooleanWidget;

});