/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var State,
        CLASS = 'state',
        NAME_BASE = $('<div/>');


    State = function () {
    };

    State.prototype.renderMetaType = function () {
        this.$el.addClass(CLASS);

        this.$name = NAME_BASE.clone();
        this.$name.text(this._getName());

        this.$el.append(this.$name);
    };


    return State;
});