/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'], function (WidgetBase) {

    'use strict';

    var StringWidget,
        INPUT_BASE = $('<input/>', {type: 'text'});

    StringWidget = function (propertyDesc) {
        var self = this;

        WidgetBase.call(this, propertyDesc);

        this.__input = INPUT_BASE.clone();
        this.__input.val(this.propertyValue);

        if (propertyDesc.regex) {
            propertyDesc.regexMessage = propertyDesc.regexMessage || 'Value has to match regex: ' + propertyDesc.regex;
            this.__input.attr('pattern', propertyDesc.regex);
            this.__input.attr('title', propertyDesc.regexMessage);
        }

        this.__input.on('keyup change', function (e) {
            e.stopPropagation();
            e.preventDefault();

            self.setValue(self.__input.val());
        });

        this.__input.on('blur', function (/* e */) {
            self.fireFinishChange();
        });

        this.__input.on('keydown', function (e) {
            if (e.keyCode === 13) {
                this.blur();
            }
        });

        this.updateDisplay();

        this.el.append(this.__input);
    };

    StringWidget.prototype = Object.create(WidgetBase.prototype);
    StringWidget.prototype.constructor = StringWidget;

    StringWidget.prototype.updateDisplay = function () {
        // Stops the caret from moving on account of:
        // keyup -> setValue -> updateDisplay
        if (document.activeElement !== this.__input[0]) {
            this.__input.val(this.getValue());
        }
        return WidgetBase.prototype.updateDisplay.call(this);
    };

    StringWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this.__input.attr('disabled', 'disabled');
        } else {
            this.__input.removeAttr('disabled');
        }
    };

    return StringWidget;

});