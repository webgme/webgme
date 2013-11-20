/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var ToolbarLabel;

    ToolbarLabel = function (params) {
        this.el = $('<div class="toolbar-label"></div>');
    };

    ToolbarLabel.prototype.text = function (text) {
        this.el.text(text);
    };

    return ToolbarLabel;
});