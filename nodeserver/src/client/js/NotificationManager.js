/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

/*
 * -------- NOTIFICATIONMANAGER -------
 */

define(['jquery',
        'lib/jquery/jquery.jgrowl.min',
        'lib/jquery/jquery.gritter.min',
        'clientUtil'], function (jquery, myjgrowl, mygritter, util) {

    //load its own CSS file
    util.loadCSS('css/jgrowl/jquery.jgrowl.css');

    var activeNotifications = {};

    return {
        displayMessage : function (msg) {
            //$.jGrowl(msg);

            $.gritter.add({
                title: '',
                text: msg,
                time: 3000
            });

        }
    };
});

