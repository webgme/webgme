/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ButtonBase',
        'js/Controls/iCheckBox',
        './ToolbarItemBase'], function (buttonBase,
                                            iCheckBox,
                                            ToolbarItemBase) {

    var ToolbarDropDownButton;

    ToolbarDropDownButton = function (params) {
        this.el = $('<div/>', {
            "class": "btn-group"
        });

        delete params.clickFn;

        var btn = buttonBase.createButton(params);
        var caret = $('<span class="caret"></span>');

        this._ulMenu = $('<ul class="dropdown-menu"></ul>');

        if (params && params.menuClass) {
            this._ulMenu.addClass(params.menuClass);
        }

        btn.append(' ').append(caret);

        btn.addClass("dropdown-toggle");
        btn.attr('data-toggle', "dropdown");

        this.el.append(btn).append(this._ulMenu);
    };

    _.extend(ToolbarDropDownButton.prototype, ToolbarItemBase.prototype);

    ToolbarDropDownButton.prototype.clear = function () {
        this._ulMenu.empty();
    };

    ToolbarDropDownButton.prototype.enabled = function (enabled) {
        if (enabled === true) {
            this.el.find('.btn').removeClass("disabled");
        } else {
            this.el.find('.btn').addClass("disabled");
        }
    };

    ToolbarDropDownButton.prototype.addButton = function (params) {
        var btn = buttonBase.createButton(params),
            li = $('<li></li>');

        li.append(btn.removeClass("btn btn-mini"));

        this._ulMenu.append(li);
    };

    ToolbarDropDownButton.prototype.addDivider = function () {
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

        chkLi.setEnabled = function (enabled) {
            if (enabled) {
                chkLi.removeClass('disabled');
            } else {
                chkLi.addClass('disabled');
            }

            checkBox.setEnabled(enabled);
        };

        chkLi.setChecked = function (checked) {
            checkBox.setChecked(checked);
        };

        return chkLi;
    };

    ToolbarDropDownButton.prototype.destroy = function () {
        this.el.remove();
        this.el.empty();
        this.el = undefined;
    };

    return ToolbarDropDownButton;
});