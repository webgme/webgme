/*globals define, _ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/iCheckBox', './ToolbarItemBase'], function (iCheckBox, ToolbarItemBase) {

    'use strict';

    var ToolbarCheckBox;

    ToolbarCheckBox = function (params) {

        iCheckBox.apply(this, [params]);

        this.el.addClass('toolbar-checkbox');
    };

    _.extend(ToolbarCheckBox.prototype, iCheckBox.prototype);
    _.extend(ToolbarCheckBox.prototype, ToolbarItemBase.prototype);

    return ToolbarCheckBox;
});