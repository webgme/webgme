/*globals define, _, $ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./ButtonBase', './ToolbarItemBase'], function (buttonBase, ToolbarItemBase) {

    'use strict';

    var ToolbarRadioButtonGroup,
        EL_BASE = $('<div/>', {class: 'btn-group'});

    ToolbarRadioButtonGroup = function (clickFn) {
        var btnGroup;
        this.el = btnGroup = EL_BASE.clone();

        if (clickFn) {
            btnGroup.on('click', '.btn', function (event) {
                if (!$(this).hasClass('disabled')) {
                    btnGroup.find('.btn.active').removeClass('active');
                    $(this).addClass('active');
                    clickFn.call(this, $(this).data());
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }
    };

    _.extend(ToolbarRadioButtonGroup.prototype, ToolbarItemBase.prototype);

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

        if (params && params.selected && params.selected === true) {
            this.el.find('.btn.active').removeClass('active');
            btn.addClass('active');
        }

        return btn;
    };

    ToolbarRadioButtonGroup.prototype.enabled = function (enabled) {
        if (enabled === true) {
            this.el.find('.btn').disable(false);
        } else {
            this.el.find('.btn').disable(true);
        }
    };

    return ToolbarRadioButtonGroup;
});