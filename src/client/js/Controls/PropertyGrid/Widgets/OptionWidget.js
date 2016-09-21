/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'], function (WidgetBase) {

    'use strict';

    var OptionWidget,
        EMPTY_OPTION_BASE = $('<option value="empty"/>'),
        OPTION_BASE = $('<option/>');


    OptionWidget = function (propertyDesc) {
        var self = this,
            i,
            opt;

        WidgetBase.call(this, propertyDesc);

        this.__select = $('<select/>');

        if (propertyDesc.value === null) {
            opt = EMPTY_OPTION_BASE.clone();
            opt.text('');
            this.__select.append(opt);
        }

        for (i = 0; i < this.valueItems.length; i += 1) {
            opt = OPTION_BASE.clone();
            opt.text(this.valueItems[i]);

            this.__select.append(opt);
        }

        if (this.valueItems.indexOf(propertyDesc.value) === -1) {
            this.el.prop('title', '"' + propertyDesc.value + '" <' + typeof propertyDesc.value + '> not part of enum');
        }

        this.__select.on('change', function (e) {
            var val = self.__select.val();
            e.stopPropagation();
            e.preventDefault();

            if (self.valueType === 'float') {
                val = parseFloat(val);
            } else if (self.valueType === 'integer') {
                val = parseInt(val, 10);
            }

            if (val !== NaN) {
                //remove empty value if present
                self.__select.find('option[value="empty"]').remove();

                self.setValue(val);
                self.fireFinishChange();
            }
        });

        this.updateDisplay();

        this.el.append(this.__select);
    };

    OptionWidget.prototype = Object.create(WidgetBase.prototype);
    OptionWidget.prototype.constructor = OptionWidget;

    OptionWidget.prototype.updateDisplay = function () {
        this.__select.val(this.getValue());

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    OptionWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this.__select.attr('disabled', 'disabled');
        } else {
            this.__select.removeAttr('disabled');
        }
    };

    return OptionWidget;

});