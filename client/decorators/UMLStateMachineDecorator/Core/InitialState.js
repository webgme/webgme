/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var InitialState,
        CLASS = 'initial-state';


    InitialState = function () {
    };

    InitialState.prototype.renderMetaType = function () {
        this.$el.addClass(CLASS);
    };


    return InitialState;
});