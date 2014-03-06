/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ToolbarItemBase'], function (ToolbarItemBase) {

    var ToolbarLabel;

    ToolbarLabel = function (params) {
        this.el = $('<div class="toolbar-label"></div>');
    };

    _.extend(ToolbarLabel.prototype, ToolbarItemBase.prototype);

    ToolbarLabel.prototype.text = function (text, noToolbarRefresh) {
        if (this.el) {
            this.el.text(text);
            if (noToolbarRefresh !== true) {
                this._toolbar.refresh();
            }
        }
    };

    return ToolbarLabel;
});