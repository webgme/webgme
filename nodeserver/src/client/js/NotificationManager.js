/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

/*
 * -------- NOTIFICATIONMANAGER -------
 */

define(['jquery.jgrowl.min',
        './util.js'], function (myjgrowl, util) {

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('./../lib/jgrowl/jquery.jgrowl.css');

    var activeNotifications = {};

    return {
        displayMessage : function (msg) {
            $.jGrowl(msg);
        }
    };
});

