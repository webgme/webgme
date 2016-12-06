/*globals define, _, $ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./ButtonBase', './ToolbarItemBase'], function (buttonBase, ToolbarItemBase) {

    'use strict';

    var ToolbarToggleButton,
        EL_BASE = $('<div class="toolbar-button"></div>');

    ToolbarToggleButton = function (params) {
        var oClickFn = params.clickFn,
            toggleClickFn,
            btn;

        toggleClickFn = function (data) {
            btn.toggleClass('active');
            if (oClickFn) {
                oClickFn.call(this, data, btn.hasClass('active'));
            }
        };

        params.clickFn = toggleClickFn;
        btn = this._btn = buttonBase.createButton(params);

        this.el = EL_BASE.clone();
        this.el.append(this._btn);
    };

    _.extend(ToolbarToggleButton.prototype, ToolbarItemBase.prototype);

    ToolbarToggleButton.prototype.setToggled = function (toggled) {
        this._btn.removeClass('active');
        if (toggled === true) {
            this._btn.addClass('active');
        }
    };

    ToolbarToggleButton.prototype.enabled = function (enabled) {
        this._btn.enabled(enabled);
    };

    return ToolbarToggleButton;
});