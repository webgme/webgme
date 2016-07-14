/*globals define*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase',
    'js/Controls/iCheckBox'
], function (WidgetBase,
             ICheckBox) {

    'use strict';

    var iCheckBoxWidget;

    iCheckBoxWidget = function (propertyDesc) {
        var self = this;

        WidgetBase.call(this, propertyDesc);

        this.__checkbox = new ICheckBox({
            checkedText: 'TRUE',
            uncheckedText: 'FALSE',
            title: propertyDesc.title,
            checkChangedFn: function (data, isChecked) {
                self.setValue(isChecked);
                self.fireFinishChange();
            }
        });

        this.updateDisplay();

        this.el.append(this.__checkbox.el);
    };

    iCheckBoxWidget.prototype = Object.create(WidgetBase.prototype);
    iCheckBoxWidget.prototype.constructor = iCheckBoxWidget;

    iCheckBoxWidget.prototype.updateDisplay = function () {
        this.__checkbox.setChecked(this.getValue());

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    iCheckBoxWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);
        this.__checkbox.setEnabled(!this._isReadOnly);
    };

    return iCheckBoxWidget;

});