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
                clickFn.call(this, event, $(this).data());
                event.stopPropagation();
                event.preventDefault();
            });
        }

        return $btnGroup;
    };

    DesignerCanvasToolBar.prototype.addRadioButtonGroup = function (clickFn) {
        var $btnGroup;

        $btnGroup = this.addButtonGroup(function (event, data) {
            $btnGroup.find('.btn.active').removeClass('active');
            $(this).addClass('active');
            clickFn.call(this, event, data);
        });

        return $btnGroup;
    };

    DesignerCanvasToolBar.prototype.addButton = function (params, btnGroup) {
        var $btn,
            i;

        $btn = $('<a/>', {
            "class": "btn" + (params.class || ""),
            "href": "#",
            "title": params.title
        });

        if (params.data) {
            $btn.data(params.data);
        }

        if (params.selected === true) {
            $btn.addClass("active");
        }

        if (params.icon) {
            $btn.append($('<i class="' + params.icon + '"></i>'));
        }

        if (params.text) {
            $btn.append(params.text);
        }

        if (params.clickFn) {
            $btn.on("click", function (event) {
                params.clickFn.call(this, event, $(this).data());
                event.stopPropagation();
                event.preventDefault();
            });
        }

        btnGroup.append($btn);

        return $btn;
    };

    return DesignerCanvasToolBar;
});