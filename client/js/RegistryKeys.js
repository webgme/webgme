/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

/*
 * REGISTRY KEY NAMES USED BY THE UI
 */
define([], function () {
    return {
            COLOR: 'color',   //fill color of the item
            TEXT_COLOR: 'textColor',   //color of the texts of the item
            BORDER_COLOR: 'borderColor',   //border color of the item (if any)
            POSITION : "position",  //position of the item {x, y}
            ROTATION: "rotation",   //rotation of the item
            DECORATOR: "decorator", //custom decorator name of the item
            IS_PORT: "isPort",  //if the item is port in its parent or not
            IS_ABSTRACT: "isAbstract",  //whether the item is abstract or not !!! (attribute???)
            LINE_STYLE: "lineStyle",    //the style of the line (solid, dot, dash-dot)
            LINE_TYPE: "lineType",      //the type of the line (straight, bezier, ...)
            LINE_WIDTH: 'lineWidth',     //width of the line
            LINE_START_ARROW: 'lineStartArrow',     //start arrow of a line
            LINE_END_ARROW: 'lineEndArrow',     //start arrow of a line
            LINE_CUSTOM_POINTS: 'lineCustomPoints',  //custom routing points of a line

        /*
         *
         */
            PROJECT_REGISTRY: "ProjectRegistry",
            DISPLAY_FORMAT: "DisplayFormat"
    };
});