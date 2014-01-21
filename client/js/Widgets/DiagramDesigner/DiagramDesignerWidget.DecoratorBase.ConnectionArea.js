/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['css!/css/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase.ConnectionArea'], function () {

    var DiagramDesignerWidgetDecoratorBaseConnectionArea,
        EVENT_POSTFIX = 'DiagramDesignerWidgetDecoratorBaseConnectionArea',
        DECORATOR_EDIT_CLASS = 'decorator-edit',
        CONN_AREA_EDIT_CLASS = 'conn-area-edit',
        DISABLED = 'disabled',
        DATA_CONN_AREA_ID = 'CONN_AREA_ID',
        MIN_SIZE = 8;

    DiagramDesignerWidgetDecoratorBaseConnectionArea = function () {
    };


    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._initializeConnectionAreaUserSelection = function () {
        var widget = this.hostDesignerItem.canvas,
            self = this;

        //hook up right click on the decorator
        this.$el.on('mousedown.' + EVENT_POSTFIX, function (event) {
            var rightClick = event.which === 3,
                enableEdit = widget.getIsReadOnlyMode() !== true;

            if (enableEdit && rightClick) {
                self._editConnectionAreas();
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
        });
    };


    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._editConnectionAreas = function () {
        var w = this.$el.outerWidth(true),
            h = this.$el.outerHeight(true),
            j;

        this._connAreaEditBackground = $('<div/>', { 'class': 'conn-area-edit-bg'});

        this._connAreaEditBackground.css({'width': w,
                                          'height': h});

        this.$el.addClass(DECORATOR_EDIT_CLASS);
        this.$el.parent().append(this._connAreaEditBackground);

        this._areas = this.getConnectionAreas();

        j = this._areas.length;
        while (j--) {
            var a = this._areas[j];
            var divArea = $('<div/>', { 'class': CONN_AREA_EDIT_CLASS });

            var aW = a.x2 - a.x1;
            var aH = a.y2 - a.y1;
            var aL = a.x1;
            var aT = a.y1;

            if (aW <= MIN_SIZE) {
                aL -= (MIN_SIZE - aW) / 2;
                aW = MIN_SIZE;
            }

            if (aH <= MIN_SIZE) {
                aT -= (MIN_SIZE - aH) / 2;
                aH = MIN_SIZE;
            }

            divArea.data(DATA_CONN_AREA_ID, a.id);
            divArea.css({'left': aL,
                        'top': aT,
                        'width': aW,
                        'height': aH});

           this._connAreaEditBackground.append(divArea);
        }


        this._connAreaEditBackground.on('mousedown.' + EVENT_POSTFIX, '.' + CONN_AREA_EDIT_CLASS, function (event) {
            $(this).toggleClass(DISABLED);
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        });

    };


    return DiagramDesignerWidgetDecoratorBaseConnectionArea;
});