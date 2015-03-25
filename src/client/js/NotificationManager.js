/*globals define, _, requirejs, WebGMEGlobal*/

/*
 * -------- NOTIFICATION MANAGER -------
 */

define(['lib/jquery/jquery.gritter.min',
        'js/util'], function (myjgrowl, mygritter, util) {

    "use strict";

    var activeNotifications = {};

    $.extend($.gritter.options, {
        position: 'bottom-left' // defaults to 'top-right' but can be 'bottom-left', 'bottom-right', 'top-left', 'top-right' (added in 1.7.1)
    });

    return {
        displayMessage : function (msg) {
            //$.jGrowl(msg);

            $.gritter.add({
                title : '',
                text  : msg,
                time  : 3000
            });

        },

        addStickyMessage : function (msg) {
            return $.gritter.add({
                title  : '',
                text   : msg,
                sticky : true
            });
        },

        removeStickyMessage : function (msgId) {
            $.gritter.remove(msgId, {
                fade: true, // optional
                speed: 'fast' // optional
            });
        }
    };
});

