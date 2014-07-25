/*globals define, WebGMEGlobal, alert, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['clientUtil',
    'js/Constants',
    'js/Utils/METAAspectHelper',
    'js/Utils/ExportManager',
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog',
    './PluginToolbar'], function (util,
                                CONSTANTS,
                               METAAspectHelper,
                               ExportManager,
                               ProjectsDialog,
                               CommitDialog,
                               ProjectRepositoryDialog,
                               PluginToolbar) {

    "use strict";

    var DefaultToolbar;

    DefaultToolbar = function (client) {
        this._client = client;

        this._initialize();
    };

    DefaultToolbar.prototype._initialize = function () {
        var toolbar = WebGMEGlobal.Toolbar,
            layoutToLoad = util.getURLParameterByName('layout'),
            _client = this._client,
            projectsButtonDisabledForLayouts = ['VehicleForgeLayout'];

        //#1: Projects
        if (projectsButtonDisabledForLayouts.indexOf(layoutToLoad) === -1) {
            toolbar.addButton({ "title": "Projects...",
                "icon": "glyphicon glyphicon-folder-open",
                "clickFn": function (/*data*/) {
                    var pd = new ProjectsDialog(_client);
                    pd.show();
                }});
        }

        //#2: Project repository...
        toolbar.addButton({ "title": "Project repository...",
            "icon": "glyphicon glyphicon-time",
            "clickFn": function (/*data*/) {
                var prd = new ProjectRepositoryDialog(_client);
                prd.show();
            } });

        toolbar.addButton({ "title": "Commit...",
            "icon": "glyphicon glyphicon-tag",
            "clickFn": function (/*data*/) {
                var cd = new CommitDialog(_client);
                cd.show();
            } });

        toolbar.addSeparator();

        //EXPORT & IMPORT

        toolbar.addButton({ "title": "Export project...",
            "icon": "glyphicon glyphicon-export",
            "clickFn": function (/*data*/) {
                ExportManager.export(CONSTANTS.PROJECT_ROOT_ID);
            } });

        toolbar.addSeparator();

        //META ASPECT helper parts
        toolbar.addButton({ "title": "Display META entries...",
            "icon": "glyphicon glyphicon-barcode",
            "clickFn": function (/*data*/) {
                alert('METAAspectTypes: \n' + JSON.stringify(METAAspectHelper.getMETAAspectTypesSorted(), undefined, 2));
            }});

        toolbar.addButton({ "title": "Download Domain's META javascript...",
            "icon": "glyphicon glyphicon-download-alt",
            "clickFn": function (/*data*/) {
                var meta = METAAspectHelper.generateMETAAspectJavaScript();

                if (meta && !_.isEmpty(meta)) {
                    var pom = document.createElement('a');
                    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(meta.content));
                    pom.setAttribute('download', meta.fileName);
                    $('body').append($(pom));
                    pom.click();
                    $(pom).remove();
                } else {
                    alert('Something went wrong, METAAspectTypes are not available...');
                }
            }});

        new PluginToolbar(this._client);

        //TODO: remove
        //this._createDummyControls();
    };

    DefaultToolbar.prototype._createDummyControls = function () {
        var toolbar = WebGMEGlobal.Toolbar;

        toolbar.addSeparator();

        //DEMO controls
        var btnCommit1 = toolbar.addButton({ "title": "Commit1...",
            "icon": "glyphicon glyphicon-share",
            "clickFn": function () {
                console.log('Commit1...');
            }});

        var radioButtonGroup = toolbar.addRadioButtonGroup(function (data) {
            console.log(JSON.stringify(data));
        });

        radioButtonGroup.addButton({ "title": "Radio button 1",
            "icon": "glyphicon glyphicon-align-left",
            "data": {'type': '1'}});

        radioButtonGroup.addButton({ "title": "Radio button 2",
            "icon": "glyphicon glyphicon-align-center",
            "data": {'type': '2'} });

        radioButtonGroup.addButton({ "title": "Radio button 3",
            "icon": "glyphicon glyphicon-align-right",
            "data": {'type': '3'} });

        var btnToggle1 = toolbar.addToggleButton({ "title": "Toggle button",
            "icon": "glyphicon glyphicon-plane",
            "clickFn": function (data, toggled) {
                console.log('toggled: ' + toggled);
            }});


        var txtFind = toolbar.addTextBox({
            "prependContent": '<i class="glyphicon glyphicon-search"></i>&nbsp;',
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
            "icon": "glyphicon glyphicon-plus-sign",
            "text": "1 item",
            "data": {'howmany': 1},
            "clickFn": function (data) {
                console.log(JSON.stringify(data));
            }});

        ddlCreate.addDivider();

        ddlCreate.addButton({ "title": "Create 10 items",
            "icon": "glyphicon glyphicon-plus-sign",
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
    };

    return DefaultToolbar;
});
