/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['clipboard', 'js/Controls/PropertyGrid/Widgets/WidgetBase'], function (Clipboard, WidgetBase) {

    'use strict';

    var LabelWidget,
        LABEL_BASE = $('<span/>', {class: 'user-select-on'});

    LabelWidget = function (propertyDesc) {
        WidgetBase.call(this, propertyDesc);

        this.__label = LABEL_BASE.clone();
        this.__clipboard = propertyDesc.clipboard;

        if (this.__clipboard === true) {
            new Clipboard(this.__label[0]);
            this.__label.attr('title', 'Copy to clipboard');
            this.__label.css('cursor', 'copy');
        }

        this.updateDisplay();

        this.el.append(this.__label);
    };

    LabelWidget.prototype = Object.create(WidgetBase.prototype);
    LabelWidget.prototype.constructor = LabelWidget;

    LabelWidget.prototype.updateDisplay = function () {
        this.__label.text(this.propertyValue);

        if (this.__clipboard) {
            this.__label.attr('data-clipboard-text', this.propertyValue);
        } else {
            this.__label.attr('title', this.propertyValue);
        }

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    return LabelWidget;

});