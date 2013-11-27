/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var EndState,
        CLASS = 'end-state',
        INNER_CIRCLE = $('<div/>');


    EndState = function () {
    };

    EndState.prototype.renderMetaType = function () {
        this.$el.addClass(CLASS);

        this.$el.append(INNER_CIRCLE.clone());
    };


    return EndState;
});