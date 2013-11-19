/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var DefaultToolbar;

    DefaultToolbar = function (client) {
        this._client = client;

        this._initialize();
    };

    DefaultToolbar.prototype._initialize = function () {
        var toolbar = WebGMEGlobal.Toolbar;

        var tbgProject = toolbar.addToolbarGroup();

        var btnProject = tbgProject.addButton({ "title": "Manage projects...",
            "icon": "icon-tags" });

        var btnProjectRepository = tbgProject.addButton({ "title": "Project repository...",
            "icon": "icon-road" });

        var btnCommit = tbgProject.addButton({ "title": "Commit...",
            "icon": "icon-share" });

        tbgProject.addSeparator();

        var btnCommit1 = tbgProject.addButton({ "title": "Commit...",
            "icon": "icon-share" });
    };

    return DefaultToolbar;
});
