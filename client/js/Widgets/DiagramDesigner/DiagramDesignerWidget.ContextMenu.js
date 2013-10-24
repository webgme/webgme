"use strict";

define(['lib/jquery/jquery.contextMenu'], function () {

    var DiagramDesignerWidgetContextMenu;

    DiagramDesignerWidgetContextMenu = function () {

    };

    DiagramDesignerWidgetContextMenu.prototype.createMenu = function (itemsCallback, position) {
        $.contextMenu( 'destroy', '.diagram-designer' );

        $.contextMenu({
            selector: '.diagram-designer',
            /*position: function(selector, x, y) {
             var _offset = selector.$trigger.find('.dynatree-title').offset();
             selector.$menu.css({top: _offset.top + 10, left: _offset.left - 10});
             },*/
            build: function($trigger, e) {
                // this callback is executed every time the menu is to be shown
                // its results are destroyed every time the menu is hidden
                // e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
                return {
                    callback: function(key, options) {
                        /*var node = $.ui.dynatree.getNode(options.$trigger),
                         m = "clicked: '" + key + "' on '" + node.data.title + " (" + node.data.key + ")'";*/
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