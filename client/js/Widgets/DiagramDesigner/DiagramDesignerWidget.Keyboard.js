/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var DiagramDesignerWidgetKeyboard;

    DiagramDesignerWidgetKeyboard = function () {

    };

    DiagramDesignerWidgetKeyboard.prototype._registerKeyboardListener = function () {
        WebGMEGlobal.KeyboardManager.registerListener(this);
    };

    DiagramDesignerWidgetKeyboard.prototype._unregisterKeyboardListener = function () {
        WebGMEGlobal.KeyboardManager.registerListener(undefined);
    };

    DiagramDesignerWidgetKeyboard.prototype.onKeyDown = function (eventArgs) {
        var ret = true;

        switch (eventArgs.combo) {
            case 'del':
                this.onSelectionDelete(this.selectionManager.selectedItemIdList);
                ret = false;
                break;
            case 'ctrl+a':
                this.selectAll();
                ret = false;
                break;
            case 'ctrl+q':
                this.selectNone();
                ret = false;
                break;
            case 'ctrl+i':
                this.selectItems();
                ret = false;
                break;
            case 'ctrl+u':
                this.selectConnections();
                ret = false;
                break;
            case 'ctrl+l':
                this.selectInvert();
                ret = false;
                break;
        }

        return ret;
    };

    return DiagramDesignerWidgetKeyboard;
});
