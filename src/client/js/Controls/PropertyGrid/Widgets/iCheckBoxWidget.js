/*globals define, _*/
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

        iCheckBoxWidget.superclass.call(this, propertyDesc);

        this.__checkbox = new ICheckBox({
            checkedText: 'YES',
            uncheckedText: 'NO',
            checkChangedFn: function (data, isChecked) {
                self.setValue(isChecked);
                self.fireFinishChange();
            }
        });

        this.updateDisplay();

        this.el.append(this.__checkbox.el);
    };

    iCheckBoxWidget.superclass = WidgetBase;

    _.extend(
        iCheckBoxWidget.prototype,
        WidgetBase.prototype
    );

    iCheckBoxWidget.prototype.updateDisplay = function () {
        this.__checkbox.setChecked(this.getValue());

        return iCheckBoxWidget.superclass.prototype.updateDisplay.call(this);
    };

    iCheckBoxWidget.prototype.setReadOnly = function (isReadOnly) {
        iCheckBoxWidget.superclass.prototype.setReadOnly.call(this, isReadOnly);

        this.__checkbox.setEnabled(!isReadOnly);
    };

    return iCheckBoxWidget;

});