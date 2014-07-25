/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var DiagramDesignerWidgetClipboard;

    DiagramDesignerWidgetClipboard = function () {
    };

    DiagramDesignerWidgetClipboard.prototype.onCopy = function () {
        this.logger.warning("DiagramDesignerWidget.onCopy is not overridden in the controller!!!");
        return undefined;
    };

    DiagramDesignerWidgetClipboard.prototype.onPaste = function (data) {
        this.logger.warning("DiagramDesignerWidget.onPaste is not overridden in the controller!!! data: " + data);
    };

    return DiagramDesignerWidgetClipboard;
});
