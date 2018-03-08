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
        SORTABLE_BASE = $('<ul class="ui-sortable"></ul>');

    SortableWidget = function (propertyDesc) {
        var self = this;

        WidgetBase.call(this, propertyDesc);

        this._readOnly = false;
        this.__sortable = SORTABLE_BASE.clone();

        console.log(propertyDesc);
        console.log(this.valueItems);
        propertyDesc.valueItems.map((sortable) => {
            self.addSortable(sortable);
        });

        this.el.append(this.__sortable);
    };

    SortableWidget.prototype = Object.create(WidgetBase.prototype);
    SortableWidget.prototype.constructor = SortableWidget;

    SortableWidget.prototype.setReadOnly = function(isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this.__sortable.attr('disabled', 'disabled');
        } else {
            this.__sortable.removeAttr('disabled');
        }
    };

    SortableWidget.prototype.addSortable = function(sortable) {
        var self = this;
        console.log(`sortable: ${sortable}`);
        self.__sortable.append(`<li class="alert alert-info ui-sortable-handle" title="${sortable}">${sortable}</li>`);
        console.log(`made: ${sortable}`);
    };

    return SortableWidget;

});
