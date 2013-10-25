"use strict";

define(['lib/jquery/jquery.contextMenu'], function () {

    var DiagramDesignerWidgetContextMenu;

    DiagramDesignerWidgetContextMenu = function () {

    };

    DiagramDesignerWidgetContextMenu.prototype.createMenu = function (itemsCallback, position) {
        $.contextMenu( 'destroy', '.diagram-designer' );

        $.contextMenu({
            selector: '.diagram-designer',
            build: function($trigger, e) {
                // this callback is executed every time the menu is to be shown
                // its results are destroyed every time the menu is hidden
                // e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
                return {
                    callback: function(key, options) {
                        alert('clicked: ' + key + ' on: ' + JSON.stringify(options.$trigger));
                    },
                    items: itemsCallback($trigger, e)
                };
            }
        });

        position = position || {x: 200, y: 200};
        $(".diagram-designer").contextMenu(position);
    };


    return DiagramDesignerWidgetContextMenu;
});