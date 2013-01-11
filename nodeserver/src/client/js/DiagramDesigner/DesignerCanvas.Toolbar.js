"use strict";

define([], function () {

    var DesignerCanvasToolBar;

    DesignerCanvasToolBar = function () {
    };

    DesignerCanvasToolBar.prototype.addButtonGroup = function (clickFn) {
        var $btnGroup = $('<div/>', {
            "class": "btn-group inline"
        });

        this.skinParts.$toolBar.append($btnGroup);

        if (clickFn) {
            $btnGroup.on("click", ".btn", function (event) {
                clickFn.call(this, event);
                event.stopPropagation();
                event.preventDefault();
            });
        }

        return $btnGroup;
    };

    DesignerCanvasToolBar.prototype.addButton = function (params, btnGroup) {
        var $btn,
            i,
            dataAttrs;

        $btn = $('<a/>', {
            "class": "btn " + params.class || "",
            "href": "#",
            "title": params.title
        });

        if (params.data) {
            dataAttrs = {};
            for (i in params.data) {
                if (params.data.hasOwnProperty(i)) {
                    dataAttrs["data-" + i] = params.data[i];
                }
            }

            $btn.attr(dataAttrs);
        }

        if (params.icon) {
            $btn.append($('<i class="' + params.icon + '"></i>'));
        }

        if (params.text) {
            $btn.append(params.text);
        }

        if (params.clickFn) {
            $btn.on("click", function (event) {
                params.clickFn.call(this, event);
                event.stopPropagation();
                event.preventDefault();
            });
        }

        btnGroup.append($btn);

        return $btn;
    };

    return DesignerCanvasToolBar;
});