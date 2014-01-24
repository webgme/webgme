/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'raphaeljs',
    'css!/css/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase.ConnectionArea'], function (CONSTANTS) {

    var DiagramDesignerWidgetDecoratorBaseConnectionArea,
        EVENT_POSTFIX = 'DiagramDesignerWidgetDecoratorBaseConnectionArea',
        DECORATOR_EDIT_CLASS = 'decorator-edit',
        CONN_AREA_EDIT_CLASS = 'conn-area-edit',
        CONN_AREA_EDIT_BACKGROUND = 'conn-area-edit-bg',
        DISABLED = 'disabled',
        DATA_CONN_AREA_ID = 'CONN_AREA_ID',
        CONN_AREA_SIZE = 8,
        DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY = 'DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY';

    DiagramDesignerWidgetDecoratorBaseConnectionArea = function () {
    };


    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._initializeConnectionAreaUserSelection = function () {
        var self = this;

        //hook up right click on the decorator
        this.$el.on('mousedown.' + EVENT_POSTFIX, function (event) {
            var rightClick = event.which === 3;

            if (rightClick) {
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
            j,
            self = this,
            shiftVal = (CONN_AREA_SIZE / 2);

        //do not edit in ReadOnly mode
        if (this.hostDesignerItem.canvas.getIsReadOnlyMode() === true) {
            return;
        }

        this._connAreaEditBackground = $('<div/>', { 'class': CONN_AREA_EDIT_BACKGROUND});
        this._connAreaEditBackground.css({'left': -shiftVal + 'px',
            'top': -shiftVal + 'px'});

        this.$el.addClass(DECORATOR_EDIT_CLASS);
        this._decoratorItem = this.$el.parent();
        this._decoratorItem.append(this._connAreaEditBackground);

        this._connAreaEditBackground.on('mouseup mouseenter mouseleave dblclick', function (event) {
            event.stopPropagation();
        });

        this._connAreaEditBackground.on('mousedown', function (event) {
            event.stopPropagation();

            //save selection on right-click
            var rightClick = event.which === 3;
            if (rightClick) {
                self._endEditConnectionAreas();
            }
        });

        //hook up mouse event handler on the connection areas to toggle enabled/disabled state
        this._connAreaEditBackground.on('mousedown.' + EVENT_POSTFIX, 'path.' + CONN_AREA_EDIT_CLASS, function (event) {
            //$(this.node).toggleClass(DISABLED);
            var c = $(this).attr("class");
            if (c === CONN_AREA_EDIT_CLASS) {
                $(this).attr({ "class": CONN_AREA_EDIT_CLASS + ' ' + DISABLED });
            } else {
                $(this).attr({ "class": CONN_AREA_EDIT_CLASS });
            }
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        });

        this._svg = Raphael(this._connAreaEditBackground[0], w + CONN_AREA_SIZE, h + CONN_AREA_SIZE);
        this._svg.canvas.className.baseVal = CONN_AREA_EDIT_BACKGROUND;

        //get the connection areas from the decorator and render them
        this._areas = this.getConnectionAreas();

        var disabledAreas = this._getDisabledConnectionAreas();

        j = this._areas.length;
        while (j--) {
            var a = this._areas[j];
            a.x1 += shiftVal;
            a.y1 += shiftVal;
            a.x2 += shiftVal;
            a.y2 += shiftVal;

            //if the area is too small, enlarge it
            if (a.x2 - a.x1 < CONN_AREA_SIZE &&
                a.y2 - a.y1 < CONN_AREA_SIZE) {
                a.x1 -= CONN_AREA_SIZE / 2;
                a.x2 += CONN_AREA_SIZE / 2;
            }

            var path = this._svg.path('M ' + a.x1 + ',' + a.y1 + 'L' + a.x2 + ',' + a.y2);
            $(path.node).data(DATA_CONN_AREA_ID, a.id);
            path.attr({ "stroke-width": CONN_AREA_SIZE });

            if (disabledAreas.indexOf(a.id) !== -1) {
                //disabled as of now
                $(path.node).attr({ "class":  CONN_AREA_EDIT_CLASS + ' ' + DISABLED });
            } else {
                //enabled
                $(path.node).attr({ "class": CONN_AREA_EDIT_CLASS });
            }
        }
    };

    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._endEditConnectionAreas = function () {
        var connAreas = this._connAreaEditBackground.find('path.' + CONN_AREA_EDIT_CLASS),
            logger = this.logger,
            disabledAreas = [];

        connAreas.each(function(index, value) {
            value = $(value);
            var id = value.data(DATA_CONN_AREA_ID),
                enabled = value.attr("class") === CONN_AREA_EDIT_CLASS;

            logger.debug('Connection area: "' + id + '" enabled: ' + enabled);
            if (!enabled) {
                disabledAreas.push(id);
            }
        });

        if (connAreas.length > 0 && connAreas.length !== disabledAreas.length) {
            //finish editing
            this.$el.removeClass(DECORATOR_EDIT_CLASS);
            this._connAreaEditBackground.remove();

            this._setDisabledConnectionAreas(disabledAreas);
        }
    };

    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._getDisabledConnectionAreas = function () {
        var result = [],
            client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            decoratorID = this.DECORATORID,
            diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry;

        if (nodeObj) {
            diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry = nodeObj.getRegistry(DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY) || {};
            if (diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry[decoratorID]) {
                result = diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry[decoratorID].slice(0);
            }
        }

        return result;
    };

    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._setDisabledConnectionAreas = function (disabledAreaIdList) {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            decoratorID = this.DECORATORID,
            diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry;

        if (nodeObj) {
            diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry = nodeObj.getEditableRegistry(DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY) || {};
            diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry[decoratorID] = disabledAreaIdList.slice(0);

            client.setRegistry(this._metaInfo[CONSTANTS.GME_ID], DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY, diagramDesignerWidgetDecoratorDisabledConnectionAreasRegistry);
        }
    };


    return DiagramDesignerWidgetDecoratorBaseConnectionArea;
});