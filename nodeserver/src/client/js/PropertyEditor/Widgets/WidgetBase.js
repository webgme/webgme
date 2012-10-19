"use strict";

define([], function () {

    var WidgetBase = function (propertyDesc) {
        this.el = $("<div/>");

        this.propertyValue = propertyDesc.value;
        this.originalValue = propertyDesc.value;
        this.propertyName = propertyDesc.name;
        this.propertyID = propertyDesc.id;

        //The function to be called on change.
        this.__onChange = undefined;

        // The function to be called on finishing change.
        this.__onFinishChange = undefined;
    };

    WidgetBase.prototype.onChange = function (fnc) {
        this.__onChange = fnc;
        return this;
    };

    WidgetBase.prototype.onFinishChange = function (fnc) {
        this.__onFinishChange = fnc;
        return this;
    };

    WidgetBase.prototype.setValue = function (newValue) {
        var _oldValue = this.propertyValue;
        if (newValue !== _oldValue) {
            this.propertyValue = newValue;
            if (this.__onChange) {
                this.__onChange.call(this, { "id": this.propertyID,
                    "oldValue": _oldValue,
                    "newValue": newValue });
            }
            this.updateDisplay();
        }
        return this;
    };

    WidgetBase.prototype.fireFinishChange = function () {
        if (this.originalValue !== this.propertyValue) {
            if (this.__onFinishChange) {
                this.__onFinishChange.call(this, { "id": this.propertyID,
                    "oldValue": this.originalValue,
                    "newValue": this.propertyValue });
            }
            this.originalValue = this.propertyValue;
        }
    };

    WidgetBase.prototype.getValue = function () {
        return this.propertyValue;
    };

    WidgetBase.prototype.updateDisplay = function () {
        return this;
    };

    WidgetBase.prototype.remove = function () {
        this.__onChange = undefined;
        this.__onFinishChange = undefined;
        this.el.remove();
    };

    return WidgetBase;
});