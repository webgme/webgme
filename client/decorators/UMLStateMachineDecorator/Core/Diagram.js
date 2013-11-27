/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['text!./Diagram.svg'], function (diagramSVG) {

    var Diagram,
        CLASS = 'diagram',
        GRAPHICS_BASE = $(diagramSVG),
        NAME_BASE = $('<div/>');


    Diagram = function () {
    };

    Diagram.prototype.renderMetaType = function () {
        this.$el.addClass(CLASS);

        this.$name = NAME_BASE.clone();
        this.$name.text(this._getName());

        this.$el.append(GRAPHICS_BASE.clone());

        this.$el.append(this.$name);
    };


    return Diagram;
});