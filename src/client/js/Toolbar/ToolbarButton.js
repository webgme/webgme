/*globals define, $, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./ButtonBase', './ToolbarItemBase'], function (buttonBase, ToolbarItemBase) {

    'use strict';

    var ToolbarButton;

    ToolbarButton = function (params) {
        this.el = $('<div class="toolbar-button"></div>');

        this._btn = buttonBase.createButton(params);

        this.el.append(this._btn);
    };

    _.extend(ToolbarButton.prototype, ToolbarItemBase.prototype);

    ToolbarButton.prototype.enabled = function (enabled) {
        this._btn.enabled(enabled);
    };

    return ToolbarButton;
});