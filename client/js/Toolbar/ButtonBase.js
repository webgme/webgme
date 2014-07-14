/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var _createButton = function (params) {
        var $btn,
            i,
            btnClass = "btn btn-mini";

        $btn = $('<a/>', {
            "class": btnClass,
            "href": "#",
            "title": params.title
        });

        if (params.data) {
            $btn.data(params.data);
        }

        if (params.icon) {
            if (typeof params.icon === 'string') {
                $btn.append($('<i class="' + params.icon + '"></i>'));
            } else {
                $btn.append(params.icon);
            }
        }

        if (params.text) {
            if (params.icon) {
                $btn.append(' ');
            }
            $btn.append(params.text);
        }

        if (params.clickFn) {
            $btn.on("click", function (event) {
                if (!$btn.hasClass("disabled")) {
                    params.clickFn.call(this, $(this).data());
                }
                if (params.clickFnEventCancel !== false) {
                    event.stopPropagation();
                    event.preventDefault();
                }
            });
        }

        $btn.enabled = function (enabled) {
            if (enabled === true) {
                $btn.disable(false);
            } else {
                $btn.disable(true);
            }
        };

        return $btn;
    };


    return { createButton: _createButton};
});