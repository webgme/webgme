"use strict";

define(['lib/jquery/jquery.contextMenu'], function () {

    var DiagramDesignerWidgetContextMenu,
        MENU_SELECTOR = '.diagram-designer';

    DiagramDesignerWidgetContextMenu = function () {

    };

    DiagramDesignerWidgetContextMenu.prototype.createMenu = function (menuItems, fnCallback, position) {
        var logger = this.logger,
            _destroyMenu = this._destroyMenu;

        _destroyMenu();

        //make sure menuItems does not contain callback
        for (var i in menuItems) {
            if (menuItems.hasOwnProperty(i)) {
                delete menuItems[i]['callback'];
            }
        }

        $.contextMenu({
            selector: MENU_SELECTOR,
            build: function($trigger, e) {
                // this callback is executed every time the menu is to be shown
                // its results are destroyed every time the menu is hidden
                // e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
                return {
                    callback: function(key, options) {
                        logger.debug('DiagramDesignerWidgetContextMenu_clicked: ' + key);
                        if (fnCallback) {
                            fnCallback(key);
                        }
                        _destroyMenu();
                    },
                    items: menuItems
                };
            }
        });

        position = position || {x: 200, y: 200};
        $(MENU_SELECTOR).contextMenu(position);
    };

    DiagramDesignerWidgetContextMenu.prototype._destroyMenu = function () {
        $.contextMenu( 'destroy', MENU_SELECTOR );
    };


    return DiagramDesignerWidgetContextMenu;
});