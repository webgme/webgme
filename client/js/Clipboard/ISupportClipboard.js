/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var ISupportClipboard;

    ISupportClipboard = function () {
    };

    ISupportClipboard.prototype.onCopy = function () {
        this.logger.warning("ISupportClipboard.prototype.onCopy IS NOT IMPLEMENTED!!!");
        return undefined;
    };

    ISupportClipboard.prototype.onPaste = function (data) {
        this.logger.warning("ISupportClipboard.prototype.onPaste IS NOT IMPLEMENTED!!! DATA: " + data);
    };

    return ISupportClipboard;
});