"use strict";

define([
    'js/PropertyEditor/Widgets/NumberWidgetBase'
], function (NumberWidgetBase) {

  /**
   * @class Represents a given property of an object that is a number and
   * provides an input element with which to manipulate it.
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Object} [params] Optional parameters
   * @param {Number} [params.min] Minimum allowed value
   * @param {Number} [params.max] Maximum allowed value
   * @param {Number} [params.step] Increment by which to change value
   *
   *
   */
    var NumberBoxWidget;

    NumberBoxWidget = function (propertyDesc) {
        var self = this;

        this.__truncationSuspended = false;

        NumberBoxWidget.superclass.call(this, propertyDesc);

        this.__input = $('<input/>', {
            "type": "text",
            "value": this.propertyValue
        });

        // Makes it so manually specified values are not truncated.

        this.__input.on('change', function (/*e*/) {
            self._onChange();
        });
        this.__input.on('blur', function (/*e*/) {
            self._onBlur();
        });
        this.__input.on('mousedown', function (e) {
            var prev_y = e.clientY,
                onMouseDrag,
                onMouseUp;

            onMouseDrag = function (e) {
                var diff = prev_y - e.clientY;
                self.setValue(self.getValue() + diff * self.__impliedStep);
                prev_y = e.clientY;
            };

            onMouseUp = function (/*e*/) {
                $(window).off('mousemove', onMouseDrag);
                $(window).off('mouseup', onMouseUp);
            };

            $(window).on('mousemove', onMouseDrag);
            $(window).on('mouseup', onMouseUp);
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

    NumberBoxWidget.superclass = NumberWidgetBase;

    _.extend(NumberBoxWidget.prototype, NumberWidgetBase.prototype);

    /*OVERRIDE INHERITED PROPERTIES*/

    NumberBoxWidget.prototype.updateDisplay = function () {
        this.__input.val(this.__truncationSuspended ? this.getValue() : this._roundToDecimal(this.getValue(), this.__precision));
        return NumberBoxWidget.superclass.prototype.updateDisplay.call(this);
    };

    /*DEFINE CUSTOM PROPERTIES*/
    NumberBoxWidget.prototype._roundToDecimal = function (value, decimals) {
        var tenTo = Math.pow(10, decimals);
        return Math.round(value * tenTo) / tenTo;
    };

    NumberBoxWidget.prototype._onChange = function () {
        var attempted = parseFloat(this.__input.val());
        if (!_.isNaN(attempted)) {
            this.setValue(attempted);
        }
    };

    NumberBoxWidget.prototype._onBlur = function () {
        this._onChange();
        this.fireFinishChange();
    };

    return NumberBoxWidget;
});

