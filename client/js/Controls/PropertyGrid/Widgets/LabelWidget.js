"use strict";

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'],
    function (WidgetBase) {

        var LabelWidget;

        LabelWidget = function (propertyDesc) {
            LabelWidget.superclass.call(this, propertyDesc);

            var _self = this;

            this.__label = $('<span/>', {'class': 'user-select-on'});


            this.updateDisplay();

            this.el.append(this.__label);
        };

        LabelWidget.superclass = WidgetBase;

        _.extend(
            LabelWidget.prototype,
            WidgetBase.prototype
        );

        LabelWidget.prototype.updateDisplay = function () {
            this.__label.text(this.propertyValue);
            this.__label.attr('title', this.propertyValue);
            return LabelWidget.superclass.prototype.updateDisplay.call(this);
        };

        return LabelWidget;

    });