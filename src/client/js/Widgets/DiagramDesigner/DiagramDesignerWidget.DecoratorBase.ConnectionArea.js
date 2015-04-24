/*globals define, $, Raphael*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/Constants',
    'js/RegistryKeys',
    'raphaeljs',
    'css!./styles/DiagramDesignerWidget.DecoratorBase.ConnectionArea.css'
], function (CONSTANTS, REGISTRY_KEYS) {

    'use strict';

    var DiagramDesignerWidgetDecoratorBaseConnectionArea,
        EVENT_POSTFIX = 'DiagramDesignerWidgetDecoratorBaseConnectionArea',
        DECORATOR_EDIT_CLASS = 'decorator-edit',
        CONN_AREA_EDIT_CLASS = 'conn-area-edit',
        CONN_AREA_EDIT_BACKGROUND = 'conn-area-edit-bg',
        DISABLED = 'disabled',
        DATA_CONN_AREA_ID = 'CONN_AREA_ID',
        CONN_AREA_SIZE = 8,
        DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY =
            REGISTRY_KEYS.DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS;

    DiagramDesignerWidgetDecoratorBaseConnectionArea = function () {
    };


    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._initializeConnectionAreaUserSelection = function () {
        var self = this;

        //hook up right click on the decorator
        this.$el.on('mousedown.' + EVENT_POSTFIX, function (event) {
            var rightClick = event.which === 3;

            if (rightClick) {
                if (self._editConnectionAreas() === true) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                }
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
            return false;
        }

        //do not enter edit mode if there is no connection area defined at all
        if (this.getConnectionAreas().length === 0) {
            return false;
        }

        this._connAreaEditBackground = $('<div/>', {'class': CONN_AREA_EDIT_BACKGROUND});
        this._connAreaEditBackground.css({
            'left': -shiftVal + 'px',
            'top': -shiftVal + 'px'
        });

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
            var c = $(this).attr('class');
            if (c === CONN_AREA_EDIT_CLASS) {
                $(this).attr({'class': CONN_AREA_EDIT_CLASS + ' ' + DISABLED});
            } else {
                $(this).attr({'class': CONN_AREA_EDIT_CLASS});
            }
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        });

        // jshint newcap:false
        this._svg = Raphael(this._connAreaEditBackground[0], w + CONN_AREA_SIZE, h + CONN_AREA_SIZE);
        // jshint newcap:true
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
            if (Math.abs(a.x2 - a.x1) < CONN_AREA_SIZE &&
                Math.abs(a.y2 - a.y1) < CONN_AREA_SIZE) {
                if (a.x2 > a.x1) {
                    a.x1 -= CONN_AREA_SIZE / 2;
                    a.x2 += CONN_AREA_SIZE / 2;
                } else {
                    a.x2 -= CONN_AREA_SIZE / 2;
                    a.x1 += CONN_AREA_SIZE / 2;
                }

            }

            var path = this._svg.path('M ' + a.x1 + ',' + a.y1 + 'L' + a.x2 + ',' + a.y2);
            $(path.node).data(DATA_CONN_AREA_ID, a.id);
            path.attr({'stroke-width': CONN_AREA_SIZE});

            if (disabledAreas.indexOf(a.id) !== -1) {
                //disabled as of now
                $(path.node).attr({'class': CONN_AREA_EDIT_CLASS + ' ' + DISABLED});
            } else {
                //enabled
                $(path.node).attr({'class': CONN_AREA_EDIT_CLASS});
            }
        }

        return true;
    };

    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._endEditConnectionAreas = function () {
        var connAreas = this._connAreaEditBackground.find('path.' + CONN_AREA_EDIT_CLASS),
            logger = this.logger,
            disabledAreas = [];

        connAreas.each(function (index, value) {
            value = $(value);
            var id = value.data(DATA_CONN_AREA_ID),
                enabled = value.attr('class') === CONN_AREA_EDIT_CLASS;

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
        var objID = this._metaInfo[CONSTANTS.GME_ID],
            decoratorID = this.DECORATORID,
            result = [],
            regKey = DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY + decoratorID,
            registry = this.preferencesHelper.getRegistry(objID, regKey, true) || [];

        if (registry) {
            result = registry.slice(0);
        }

        return result;
    };

    DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype._setDisabledConnectionAreas =
        function (disabledAreaIdList) {
            var objID = this._metaInfo[CONSTANTS.GME_ID],
                decoratorID = this.DECORATORID,
                regKey = DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS_REGISTRY_KEY + decoratorID;

            if (disabledAreaIdList.length === 0) {
                this.preferencesHelper.delRegistry(objID, regKey);
            } else {
                this.preferencesHelper.setRegistry(objID, regKey, disabledAreaIdList.slice(0));
            }

        };


    return DiagramDesignerWidgetDecoratorBaseConnectionArea;
});
