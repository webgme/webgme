/*globals define,Raphael,_*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved
 *
 * @author brollb / https://github/brollb
 * 
 * Adding decorator support for showing connection areas
 */

define(['./SnapEditorWidget.Constants'], function (SNAP_CONSTANTS){
    
    "use strict";

    //Stuff for displaying connection area
    var CONN_AREA_EDIT_CLASS = "conn-area-edit",
        CONN_AREA_SIZE = 8,
        CONN_AREA = "conn-area-edit-bg",
        DATA_CONN_AREA_ID = "connection-id",
        DEFAULT_COLOR = "#666666";//FIXME Move to css

    var SnapEditorWidgetDecoratorBaseConnectionAreas = function(){
    };

    //For debugging
    SnapEditorWidgetDecoratorBaseConnectionAreas.prototype.displayAllConnectionAreas = function (options) {
        //Display all connections areas with the given colors
        var areas = this.getConnectionAreas(),
            i = areas.length,
            id;

        options = options || {};
        this.hideConnectionAreas();
        while (i--){
            id = areas[i].id;
            this._displayConnectionArea(id, options[id] || DEFAULT_COLOR);
        }
    };

    //Displaying Connection Area
    SnapEditorWidgetDecoratorBaseConnectionAreas.prototype.displayConnectionArea = function (id, color) {
        this.hideConnectionAreas();
        this._displayConnectionArea(id, color);
    };

    SnapEditorWidgetDecoratorBaseConnectionAreas.prototype._displayConnectionArea = function (id, color) {
        var w = this.$el.outerWidth(true),
            h = this.$el.outerHeight(true),
            shiftVal = CONN_AREA_SIZE/2,
            conn = this._getConnectionAreaById(id),
            line = this._getConnectionHighlight(conn.ptr, conn.role) || conn,
            highlight;

        //Color
        color = color || DEFAULT_COLOR;

        if(line){
            if(this._connHighlight === undefined){
                this._connHighlight = $('<div/>', { 'class': CONN_AREA,
                    id: id });
                this._connHighlight.css({ 'position': 'absolute', 
                                     'left': -shiftVal + 'px',
                                     'top': -shiftVal + 'px'});

            }

            if (this._connHighlight.children().length === 0){
                this._svg = Raphael(this._connHighlight[0], w + CONN_AREA_SIZE, h + CONN_AREA_SIZE);
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
            path.attr({ 'stroke-width': CONN_AREA_SIZE, 'fill': color });
            $(path.node).attr({ "class": CONN_AREA_EDIT_CLASS });        

            this.$el.append(this._connHighlight);
        }
    };

    SnapEditorWidgetDecoratorBaseConnectionAreas.prototype._getConnectionHighlight = function (ptr, role) {
        var highlights = this.getSVGCustomData(SNAP_CONSTANTS.CONNECTION_HIGHLIGHT),
            i;

        if (highlights){
            i = highlights.length;
            while (i--){
                if (highlights[i].ptr === ptr && 
                    highlights[i].role === role){
                    return _.extend({}, highlights[i]);
                }
            }
        }

        return null;
    };

    SnapEditorWidgetDecoratorBaseConnectionAreas.prototype._getConnectionAreaById = function (id) {
        var areas = this.getConnectionAreas(),
            i = areas.length;

        while (i--){
            if (areas[i].id === id){
                return areas[i];
            }
        }

        return null;
    };

    SnapEditorWidgetDecoratorBaseConnectionAreas.prototype.hideConnectionAreas = function () {
        if(this._connHighlight){
            this._connHighlight.empty();
        }
    };

    return SnapEditorWidgetDecoratorBaseConnectionAreas;
});
