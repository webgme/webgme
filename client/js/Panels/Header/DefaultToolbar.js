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

        var btnProject = toolbar.addButton({ "title": "Manage projects...",
            "icon": "icon-tags",
            "data": {'type': 'Manage projects...'},
            "clickFn": function (data) {
                alert(JSON.stringify(data));
            }});

        var btnProjectRepository = toolbar.addButton({ "title": "Project repository...",
            "icon": "icon-road",
            "data": {'type': 'Project repository'},
            "clickFn": function (data) {
                alert(JSON.stringify(data));
            } });

        var btnCommit = toolbar.addButton({ "title": "Commit...",
            "icon": "icon-share",
            "data": {'type': 'Commit...'},
            "clickFn": function (data) {
                alert(JSON.stringify(data));
            } });

        toolbar.addSeparator();

        var btnCommit1 = toolbar.addButton({ "title": "Commit1...",
            "icon": "icon-share",
            "clickFn": function () {
                alert('Commit1...');
            }});

        var radioButtonGroup = toolbar.addRadioButtonGroup(function (data) {
            alert(JSON.stringify(data));
        });

        radioButtonGroup.addButton({ "title": "Commit...",
            "icon": "icon-share",
            "data": {'type': '1'}});

        radioButtonGroup.addButton({ "title": "Commit...",
            "icon": "icon-share",
            "data": {'type': '2'} });

        radioButtonGroup.addButton({ "title": "Commit...",
            "icon": "icon-share",
            "data": {'type': '3'} });

        var btnToggle1 = toolbar.addToggleButton({ "title": "Toggle",
            "icon": "icon-share",
            "clickFn": function (data, toggled) {
                alert('toggled: ' + toggled);
            }});
    };

    return DefaultToolbar;
});
