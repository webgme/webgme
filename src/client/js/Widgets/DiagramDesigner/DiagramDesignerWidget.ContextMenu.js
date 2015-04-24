/*globals define*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/ContextMenu'], function (ContextMenu) {

    'use strict';

    var DiagramDesignerWidgetContextMenu;

    DiagramDesignerWidgetContextMenu = function () {
    };

    DiagramDesignerWidgetContextMenu.prototype.createMenu = function (menuItems, fnCallback, position) {
        var logger = this.logger,
            menu;

        menu = new ContextMenu({
            items: menuItems,
            callback: function (key) {
                logger.debug('DiagramDesignerWidgetContextMenu_clicked: ' + key);
                if (fnCallback) {
                    fnCallback(key);
                }
            }
        });

        position = position || {x: 200, y: 200};
        menu.show(position);
    };

    return DiagramDesignerWidgetContextMenu;
});