/*globals define, $*/
/*jshint browser: true*/
/**
 * @author finger563 / https://github.com/finger563
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase'
], function (WidgetBase) {
    'use strict';

    var SortableWidget,
        SORTABLE_EL = $(),
        SORTABLE_BASE = $('<ul class="ui-sortable" style="padding: 5px 0 0 0; list-style-type: none;"></ul>');

    SortableWidget = function (propertyDesc) {
        var self = this;

        WidgetBase.call(this, propertyDesc);

        this._readOnly = false;
        this.__sortable = SORTABLE_BASE.clone();

        this.valueItems.map(function (sortable) {
            self.addSortable(sortable);
        });

        this.__sortable.sortable({
            stop: function (event, ui) {
                self.propertyValue = self.getResult();
            }
        }).disableSelection();

        this.el.append(this.__sortable);
    };

    SortableWidget.prototype = Object.create(WidgetBase.prototype);
    SortableWidget.prototype.constructor = SortableWidget;

    SortableWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this.__sortable.attr('disabled', 'disabled');
        } else {
            this.__sortable.removeAttr('disabled');
        }
    };

    SortableWidget.prototype.addSortable = function (sortable) {
        var self = this;
        //self.__sortable.append(`<li class="alert alert-info ui-sortable-handle" style="margin: 0 4px 4px 4px; padding: 4px;" title="${sortable}">${sortable}</li>`);
        self.__sortable.append('<li>', {
            class: "alert alert-info ui-sortable-handle",
            style: "margin: 0 4px 4px 4px; padding: 4px;",
            title: sortable,
            text: sortable
        });
    };

    SortableWidget.prototype.getResult = function () {
        var result = [];

        this.__sortable.children('li').each(function (index, li) {
            result.push($(li).text().trim());
        });

        return result;
    };

    return SortableWidget;

});
