/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager',
    'css!/css/Widgets/UserProfile/UserProfileWidget'], function (logManager) {

    var UserProfileWidget,
        USER_PROFILE_WIDGET_TEMPLATE = 'USERPROFILE';

    UserProfileWidget = function (containerEl, client) {
        this._logger = logManager.create("UserProfileWidget");

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug("Created");
    };


    UserProfileWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.html(USER_PROFILE_WIDGET_TEMPLATE);
    };


    return UserProfileWidget;
});