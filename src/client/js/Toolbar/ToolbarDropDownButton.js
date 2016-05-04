/*globals define, _, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./ButtonBase',
    'js/Controls/iCheckBox',
    'js/logger',
    './ToolbarItemBase'
], function (buttonBase,
             ICheckBox,
             Logger,
             ToolbarItemBase) {

    'use strict';

    var ToolbarDropDownButton,
        EL_BASE = $('<div/>', {class: 'btn-group'}),
        CARET_BASE = $('<span class="caret"></span>'),
        UL_BASE = $('<ul class="dropdown-menu"></ul>'),
        DIVIDER_BASE = $('<li class="divider"></li>'),
        CHK_LI_BASE = $('<li/>', {class: 'chkbox'}),
        CHK_LI_A_BASE = $('<a href="#"></a>'),
        LI_BASE = $('<li></li>');

    ToolbarDropDownButton = function (params) {
        var oClickFn,
            caret;

        this.el = EL_BASE.clone();
        this._logger = Logger.create('gme:ToolBar:ToolBarButtonDropDown:' + (new Date()).toISOString(),
            WebGMEGlobal.gmeConfig.client.log);
        if (params.clickFn) {
            oClickFn = params.clickFn;
            params.clickFnEventCancel = false;

            params.clickFn = function () {
                oClickFn();
            };
        }
        //delete params.clickFn;

        this._dropDownTxt = params.text;
        this._dropDownLimit = params.limitTxtLength || 0;
        delete params.text;

        this._dropDownBtn = buttonBase.createButton(params);

        this.dropDownText(this._dropDownTxt);

        caret = CARET_BASE.clone();

        this._ulMenu = UL_BASE.clone();

        if (params && params.menuClass) {
            this._ulMenu.addClass(params.menuClass);
        }

        this._dropDownBtn.append(' ').append(caret);

        this._dropDownBtn.addClass('dropdown-toggle');
        this._dropDownBtn.attr('data-toggle', 'dropdown');

        this.el.append(this._dropDownBtn).append(this._ulMenu);
        this._logger.debug('ctor');
    };

    _.extend(ToolbarDropDownButton.prototype, ToolbarItemBase.prototype);

    ToolbarDropDownButton.prototype.clear = function () {
        this._ulMenu.empty();
    };

    ToolbarDropDownButton.prototype.enabled = function (enabled) {
        if (!this.el) {
            this._logger.error('trying to enable', enabled);
            return;
        }
        if (enabled === true) {
            this.el.find('.btn').disable(false);
        } else {
            this.el.find('.btn').disable(true);
        }
    };

    ToolbarDropDownButton.prototype.addButton = function (params) {
        var btn,
            oclickFn,
            li = LI_BASE.clone(),
            dropDownBtn = this._dropDownBtn;

        if (params.clickFn) {
            oclickFn = params.clickFn;
            params.clickFn = function (data) {
                dropDownBtn.dropdown('toggle');
                oclickFn(data);
            };
        }

        btn = buttonBase.createButton(params);
        btn.removeClass('btn btn-mini');
        btn.addClass('dropdown-list-button');

        if (params.disabled === true) {
            btn.disable(true);
        }

        li.append(btn);

        this._ulMenu.append(li);
    };

    ToolbarDropDownButton.prototype.addDivider = function () {
        var divider = DIVIDER_BASE.clone();

        this._ulMenu.append(divider);
    };

    ToolbarDropDownButton.prototype.addCheckBox = function (params) {
        var chkLi = CHK_LI_BASE.clone(),
            a = CHK_LI_A_BASE.clone(),
            checkBox;

        if (params.text) {
            a.append(params.text);
        }

        checkBox = new ICheckBox(params);
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
                chkLi.disable(false);
            } else {
                chkLi.disable(true);
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
        this._logger.debug('destroyed');
    };

    ToolbarDropDownButton.prototype.dropDownText = function (value) {
        var oldHtml = this._dropDownBtn.html(),
            index,
            newHtml,
            label;

        if (typeof value === 'string') {
            this._dropDownTxt = value;
            label = value;
            if (this._dropDownLimit && label.length > this._dropDownLimit) {
                label = label.substr(0, this._dropDownLimit) + '...';
            }
            //setter
            index = oldHtml.indexOf('<span');
            newHtml = label + ' ' + oldHtml.substr(index);
            this._dropDownBtn.html(newHtml);
        } else {
            //getter
            return this._dropDownTxt;
        }
    };

    return ToolbarDropDownButton;
});