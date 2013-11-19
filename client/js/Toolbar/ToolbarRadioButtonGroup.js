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

define(['./ButtonBase'], function (buttonBase) {

    var ToolbarRadioButtonGroup;

    ToolbarRadioButtonGroup = function (clickFn) {
        var btnGroup;
        this.el = btnGroup = $('<div/>', {
            "class": "btn-group"
        });

        if (clickFn) {
            btnGroup.on("click", ".btn", function (event) {
                if (!$(this).hasClass("disabled")) {
                    btnGroup.find('.btn.active').removeClass('active');
                    $(this).addClass('active');
                    clickFn.call(this, $(this).data());
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }
    };

    ToolbarRadioButtonGroup.prototype.addButton = function (params) {
        var btn;
        if (params.clickFn) {
            delete params.clickFn;
        }

        btn = buttonBase.createButton(params);

        this.el.append(btn);

        if (this.el.find('.btn.active').length === 0) {
            btn.addClass('active');
        }
        return btn;
    };

    ToolbarRadioButtonGroup.prototype.enabled = function (enabled) {
        if (enabled === true) {
            this.el.find('.btn').removeClass("disabled");
        } else {
            this.el.find('.btn').addClass("disabled");
        }
    };


    return ToolbarRadioButtonGroup;
});