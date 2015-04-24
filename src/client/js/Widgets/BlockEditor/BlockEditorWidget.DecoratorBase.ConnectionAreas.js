/*globals define, Raphael, _, $*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 *
 * Adding decorator support for showing connection areas
 */


define(['./BlockEditorWidget.Constants'], function (SNAP_CONSTANTS) {

    'use strict';

    //Stuff for displaying connection area
    var CONN_AREA_EDIT_CLASS = 'conn-area-line',
        CONN_AREA_SIZE = 8,
        CONN_AREA = 'conn-area',
        DATA_CONN_AREA_ID = 'connection-id';

    var BlockEditorWidgetDecoratorBaseConnectionAreas = function () {
    };

    //For debugging
    BlockEditorWidgetDecoratorBaseConnectionAreas.prototype.displayAllConnectionAreas = function (options) {
        //Display all connections areas with the given colors
        var areas = this.getConnectionAreas(),
            i = areas.length,
            id;

        options = options || {};
        this.hideConnectionAreas();
        while (i--) {
            id = areas[i].id;
            this._displayConnectionArea(id);
        }
    };

    //Displaying Connection Area
    BlockEditorWidgetDecoratorBaseConnectionAreas.prototype.displayConnectionArea = function (id) {
        this.hideConnectionAreas();
        this._displayConnectionArea(id);
    };

    BlockEditorWidgetDecoratorBaseConnectionAreas.prototype._displayConnectionArea = function (id) {
        var w = this.$el.outerWidth(true),
            h = this.$el.outerHeight(true),
            shiftVal = CONN_AREA_SIZE / 2,
            conn = this._getConnectionAreaById(id),
            line = this._getConnectionHighlight(conn.ptr, conn.role) || conn;

        //Color
        if (line) {
            if (this._connHighlight === undefined) {
                this._connHighlight = $('<div/>', {
                    'class': CONN_AREA,
                    id: id
                });
                this._connHighlight.css({
                    'position': 'absolute',
                    'left': -shiftVal + 'px',
                    'top': -shiftVal + 'px'
                });

            }

            if (this._connHighlight.children().length === 0) {
                // jshint newcap: false
                this._svg = Raphael(this._connHighlight[0], w + CONN_AREA_SIZE, h + CONN_AREA_SIZE);
                // jshint newcap: true
                this._svg.canvas.className.baseVal = CONN_AREA;
            }

            //Create the connection area
            line.x1 += shiftVal;
            line.x2 += shiftVal;
            line.y1 += shiftVal;
            line.y2 += shiftVal;

            //if the area is too small, enlarge it
            if (Math.abs(line.x2 - line.x1) < CONN_AREA_SIZE &&
                Math.abs(line.y2 - line.y1) < CONN_AREA_SIZE) {

                if (line.x2 > line.x1) {
                    line.x1 -= CONN_AREA_SIZE / 2;
                    line.x2 += CONN_AREA_SIZE / 2;
                } else {
                    line.x2 -= CONN_AREA_SIZE / 2;
                    line.x1 += CONN_AREA_SIZE / 2;
                }
            }

            var path = this._svg.path('M ' + line.x1 + ',' + line.y1 + 'L' + line.x2 + ',' + line.y2);
            $(path.node).attr(DATA_CONN_AREA_ID, id);
            path.attr({'stroke-width': CONN_AREA_SIZE});
            $(path.node).attr({'class': CONN_AREA_EDIT_CLASS});

            this.$el.append(this._connHighlight);
        }
    };

    BlockEditorWidgetDecoratorBaseConnectionAreas.prototype._getConnectionHighlight = function (ptr, role) {
        var highlights = this.getSVGCustomData(SNAP_CONSTANTS.CONNECTION_HIGHLIGHT),
            i;

        if (highlights) {
            i = highlights.length;
            while (i--) {
                if (highlights[i].role === role) {
                    switch (role) {
                        case SNAP_CONSTANTS.CONN_INCOMING:
                            return _.extend({}, highlights[i]);

                        case SNAP_CONSTANTS.CONN_OUTGOING:
                            if (ptr === highlights[i].ptr) {
                                return _.extend({}, highlights[i]);
                            }
                    }
                }
            }
        }

        return null;
    };

    BlockEditorWidgetDecoratorBaseConnectionAreas.prototype._getConnectionAreaById = function (id) {
        var areas = this.getConnectionAreas(),
            i = areas.length;

        while (i--) {
            if (areas[i].id === id) {
                return areas[i];
            }
        }

        return null;
    };

    BlockEditorWidgetDecoratorBaseConnectionAreas.prototype.hideConnectionAreas = function () {
        if (this._connHighlight) {
            this._connHighlight.empty();
        }
    };

    return BlockEditorWidgetDecoratorBaseConnectionAreas;
});
