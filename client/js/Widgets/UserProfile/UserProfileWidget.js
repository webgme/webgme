/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager',
    'css!/css/Widgets/UserProfile/UserProfileWidget'], function (logManager) {

    var UserProfileWidget,
        USER_PROFILE_WIDGET_TEMPLATE_LOGGEDIN = '<i class="icon-user icon-white" title="Logged in as"></i> <a href="#" class="navbar-link">__USERNAME__</a> <a href="/logout" class="navbar-link"><i class="icon-eject icon-white" title="Log out"></i></a>',
        USER_PROFILE_WIDGET_TEMPLATE_NOTLOGGEDIN = '<i class="icon-user" title="Not logged in"></i>';

    UserProfileWidget = function (containerEl, client) {
        this._logger = logManager.create("UserProfileWidget");

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug("Created");
    };


    UserProfileWidget.prototype._initializeUI = function () {
        var tmp = USER_PROFILE_WIDGET_TEMPLATE_NOTLOGGEDIN;

        if (this._client &&
            this._client.getUserId &&
            this._client.getUserId() !== 'n/a') {
            tmp = USER_PROFILE_WIDGET_TEMPLATE_LOGGEDIN.replace("__USERNAME__", this._client.getUserId());
        }

        tmp = '<p class="navbar-text">' + tmp + '</p>';

        this._el.html(tmp);
    };


    return UserProfileWidget;
});