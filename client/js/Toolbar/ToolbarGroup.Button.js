/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ButtonBase'], function (buttonBase) {

    var ToolbarGroupButton;

    ToolbarGroupButton = function () {

    };


    ToolbarGroupButton.prototype.addButton = function (params) {
        var $btn = buttonBase.createButton(params);

        this.$el.append($btn);

        return $btn;
    };


    return ToolbarGroupButton;
});