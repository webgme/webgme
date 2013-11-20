/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ButtonBase',
        'js/Controls/iCheckBox'], function (buttonBase,
                                            iCheckBox) {

    var ToolbarDropDownButton;

    ToolbarDropDownButton = function (params) {
        this.el = $('<div/>', {
            "class": "btn-group"
        });

        delete params.clickFn;

        var btn = buttonBase.createButton(params);
        var caret = $('<span class="caret"></span>');

        this._ulMenu = $('<ul class="dropdown-menu"></ul>');

        btn.append(' ').append(caret);

        btn.addClass("dropdown-toggle");
        btn.attr('data-toggle', "dropdown");

        this.el.append(btn).append(this._ulMenu);
    };

    ToolbarDropDownButton.prototype.clear = function () {
        this._ulMenu.empty();
    };

    ToolbarDropDownButton.prototype.addButton = function (params) {
        var btn = buttonBase.createButton(params),
            li = $('<li></li>');

        li.append(btn.removeClass("btn btn-mini"));

        this._ulMenu.append(li);
    };

    ToolbarDropDownButton.prototype.addMenuItemDivider = function () {
        var divider = $('<li class="divider"></li>');

        this._ulMenu.append(divider);
    };

    ToolbarDropDownButton.prototype.addCheckBox = function (params) {
        var chkLi = $('<li/>', {'class': 'chkbox'}),
            a = $('<a href="#"></a>'),
            checkBox;

        if (params.text) {
            a.append(params.text);
        }

        checkBox = new iCheckBox(params);
        checkBox.el.addClass('pull-right');
        a.append(checkBox.el);

        chkLi.append(a);

        chkLi.on('click', function (event) {
            checkBox.toggleChecked();
            event.stopPropagation();
            event.preventDefault();
        });

        this._ulMenu.append(chkLi);
    };

    return ToolbarDropDownButton;
});