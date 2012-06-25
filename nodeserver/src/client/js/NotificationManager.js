/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

/*
 * -------- NOTIFICATIONMANAGER -------
 */

define(['lib/jquery/jquery.jgrowl.min',
        'clientUtil'], function (myjgrowl, util) {

    //load its own CSS file
    util.loadCSS('css/jgrowl/jquery.jgrowl.css');

    var activeNotifications = {};

    return {
        displayMessage : function (msg) {
            $.jGrowl(msg);
        }
    };
});

