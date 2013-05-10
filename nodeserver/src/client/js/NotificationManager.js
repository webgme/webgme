/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

/*
 * -------- NOTIFICATIONMANAGER -------
 */

define(['lib/jquery/jquery.gritter.min',
        'clientUtil'], function (myjgrowl, mygritter, util) {

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

