/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var ToolbarGroupButtonGroup;

    ToolbarGroupButtonGroup = function () {

    };


    ToolbarGroupButtonGroup.prototype.addButtonGroup = function (clickFn, gclass) {
        var $btnGroup = $('<div/>', {
            "class": "btn-group" + (gclass ? " " + gclass : "")
        });

        this.$el.append($btnGroup);

        if (clickFn) {
            $btnGroup.on("click", ".btn", function (event) {
                if (!$(this).hasClass("disabled")) {
                    clickFn.call(this, event, $(this).data());
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        $btnGroup.enabled = function (enabled) {
            if (enabled === true) {
                $btnGroup.find('.btn').removeClass("disabled");
            } else {
                $btnGroup.find('.btn').addClass("disabled");
            }
        };

        return $btnGroup;
    };


    return ToolbarGroupButtonGroup;
});