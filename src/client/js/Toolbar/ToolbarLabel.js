/*globals define, _, $ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./ToolbarItemBase'], function (ToolbarItemBase) {

    'use strict';

    var ToolbarLabel,
        EL_BASE = $('<div class="toolbar-label"></div>');

    ToolbarLabel = function (/* params */) {
        this.el = EL_BASE.clone();
    };

    _.extend(ToolbarLabel.prototype, ToolbarItemBase.prototype);

    ToolbarLabel.prototype.text = function (text, noToolbarRefresh) {
        if (this.el) {
            this.el.text(text);
            if (noToolbarRefresh !== true) {
                this._toolbar.refresh();
            }
        }
    };

    return ToolbarLabel;
});