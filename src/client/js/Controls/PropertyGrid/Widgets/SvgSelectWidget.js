/*globals define, $*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
    'css!./styles/SvgSelectWidget.css'
], function (WidgetBase) {

    'use strict';

    var SvgSelectWidget;

    SvgSelectWidget = function (propertyDesc) {
        var self = this,
            i,
            item,
            onClick,
            opt;

        WidgetBase.call(this, propertyDesc);

        self._items = propertyDesc.items;
        self._dropDownItems = [];
        self._value = propertyDesc.value;
        self._dropDown = $('<div class="btn-group"></div>');
        self._dropDownButton = $('<button type="button" class="multiselect dropdown-toggle btn btn-link" ' +
            'data-toggle="dropdown" aria-expanded="true"></button>');
        self._dropDownList = $('<ul class="svgselect-container dropdown-menu"></ul>');
        self._dropDown.append(self._dropDownButton);
        self._dropDown.append(self._dropDownList);

        //set inner HTML of dropdown button
        self._dropDownButton.html('<span>' + self._items[self._value] + '</span>');
        onClick = function (event) {
            self.setValue($(event.currentTarget).attr('data-value'));
            self.fireFinishChange();
        };

        for (i in self._items) {
            item = $('<li data-value="' + i + '"><a href="#">' + self._items[i] + '</a></li>');
            item.on('click', onClick);
            self._dropDownItems.push(item);
            self._dropDownList.append(item);
        }

        this.updateDisplay();

        this.el.addClass('svgselect-widget');
        this.el.append(self._dropDown);
    };

    SvgSelectWidget.prototype = Object.create(WidgetBase.prototype);
    SvgSelectWidget.prototype.constructor = SvgSelectWidget;

    SvgSelectWidget.prototype.updateDisplay = function () {
        return WidgetBase.prototype.updateDisplay.call(this);
    };

    SvgSelectWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);
        $(this._dropDownButton).disable(isReadOnly);
    };

    SvgSelectWidget.prototype.destroy = function () {
        var i;

        for (i = 0; i < this._dropDownItems.length; i += 1) {
            this._dropDownItems[i].off('click');
        }
        WidgetBase.prototype.destroy.call(this);
    };

    return SvgSelectWidget;

});