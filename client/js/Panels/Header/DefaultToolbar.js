/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog'], function (ProjectsDialog,
                                                                       CommitDialog,
                                                                        ProjectRepositoryDialog) {

    var DefaultToolbar;

    DefaultToolbar = function (client) {
        this._client = client;

        this._initialize();
    };

    DefaultToolbar.prototype._initialize = function () {
        var toolbar = WebGMEGlobal.Toolbar;

        var self = this;

        //#1: Projects
        toolbar.addButton({ "title": "Projects...",
            "icon": "icon-folder-open",
            "clickFn": function (data) {
                var pd = new ProjectsDialog(self._client);
                pd.show();
            }});

        //#2: Project repository...
        var btnProjectRepository = toolbar.addButton({ "title": "Project repository...",
            "icon": "icon-road",
            "clickFn": function (data) {
                var prd = new ProjectRepositoryDialog(self._client);
                prd.show();
            } });

        var btnCommit = toolbar.addButton({ "title": "Commit...",
            "icon": "icon-share-alt",
            "clickFn": function (data) {
                var cd = new CommitDialog(self._client);
                cd.show();
            } });

        toolbar.addSeparator();

        //TODO: remove
        //this._createDummyControls();
    };

    DefaultToolbar.prototype._createDummyControls = function () {
        var toolbar = WebGMEGlobal.Toolbar;

        //DEMO controls
        var btnCommit1 = toolbar.addButton({ "title": "Commit1...",
            "icon": "icon-share",
            "clickFn": function () {
                console.log('Commit1...');
            }});

        var radioButtonGroup = toolbar.addRadioButtonGroup(function (data) {
            console.log(JSON.stringify(data));
        });

        radioButtonGroup.addButton({ "title": "Radio button 1",
            "icon": "icon-align-left",
            "data": {'type': '1'}});

        radioButtonGroup.addButton({ "title": "Radio button 2",
            "icon": "icon-align-center",
            "data": {'type': '2'} });

        radioButtonGroup.addButton({ "title": "Radio button 3",
            "icon": "icon-align-right",
            "data": {'type': '3'} });

        var btnToggle1 = toolbar.addToggleButton({ "title": "Toggle button",
            "icon": "icon-plane",
            "clickFn": function (data, toggled) {
                console.log('toggled: ' + toggled);
            }});


        var txtFind = toolbar.addTextbox({
            "prependContent": '<i class="icon-search"></i>',
            "placeholder": "Find...",
            "textChangedFn": function (oldVal, newVal) {
                console.log(newVal);
            },
            "onEnterFn": function (val) {
                console.log(val);
            }
        });

        var label1 = toolbar.addLabel();
        label1.text('Something:');

        var chb = toolbar.addCheckBox({ "title": "BLA",
            "checkChangedFn": function(data, checked){
                console.log('checked: ' + checked + ', data: ' + JSON.stringify(data));
            }
        });

        var ddlCreate = toolbar.addDropDownButton({ "text": "Create..." });
        ddlCreate.addButton({ "title": "Create 1 item",
            "icon": "icon-plus-sign",
            "text": "1 item",
            "data": {'howmany': 1},
            "clickFn": function (data) {
                console.log(JSON.stringify(data));
            }});

        ddlCreate.addMenuItemDivider();

        ddlCreate.addButton({ "title": "Create 10 items",
            "icon": "icon-plus-sign",
            "text": "10 items",
            "data": {'howmany': 10},
            "clickFn": function (data) {
                console.log(JSON.stringify(data));
            }});

        ddlCreate.addCheckBox({"text": "check1",
            "data": { "idx": 1 },
            "checkChangedFn": function (data, isChecked) {
                console.log('checked: ' + isChecked + " , " + JSON.stringify(data));
            }});

        toolbar.addSeparator();
    };

    return DefaultToolbar;
});
