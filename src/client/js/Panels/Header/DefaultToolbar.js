/*globals define, WebGMEGlobal, console*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define([
    'js/util',
    'js/Constants',
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog',
    './PluginToolbar',
    './ConstraintToolbar',
    './MetaRulesToolbar',
], function (util,
             CONSTANTS,
             ProjectsDialog,
             CommitDialog,
             ProjectRepositoryDialog,
             PluginToolbar,
             ConstraintToolBar,
             MetaRulesToolbar) {

    'use strict';

    var DefaultToolbar;

    DefaultToolbar = function (client, params) {
        this._client = client;
        this._pluginToolBar = null;
        this._metaRulesToolBar = null;
        this._constraintToolBar = null;

        this._initialize();
    };

    DefaultToolbar.prototype._initialize = function () {
        var self = this;
        this._pluginToolBar = new PluginToolbar(this._client);
        this._metaRulesToolBar = new MetaRulesToolbar(this._client);
        //TODO the toolbar also has to be optional, but how???
        if (this._client.gmeConfig.core.enableCustomConstraints === true) {
            this._constraintToolBar = new ConstraintToolBar(this._client);
        }

        function activeNodeChanged() {
            var activeNodeId = WebGMEGlobal.State.getActiveObject(),
                allPlugins = WebGMEGlobal.allPlugins,
                filtered = [];

            if (typeof activeNodeId !== 'undefined') {
                filtered = self._client.filterPlugins(allPlugins, activeNodeId);
                if (filtered.length === 0) {
                    self._pluginToolBar.disableButtons(true);
                } else {
                    self._pluginToolBar.disableButtons(false);
                }
            } else {
                self._pluginToolBar.disableButtons(true);
            }
        }

        self._pluginToolBar.disableButtons(true);

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, activeNodeChanged);
        this._client.addEventListener(this._client.CONSTANTS.PROJECT_OPENED, activeNodeChanged);
        this._client.addEventListener(this._client.CONSTANTS.BRANCH_CHANGED, activeNodeChanged);
        this._client.addEventListener(this._client.CONSTANTS.BRANCH_STATUS_CHANGED, activeNodeChanged);
    };


    DefaultToolbar.prototype._createDummyControls = function () {
        var toolbar = WebGMEGlobal.Toolbar;

        toolbar.addSeparator();

        //DEMO controls
        toolbar.addButton({
            title: 'Commit1...',
            icon: 'glyphicon glyphicon-share',
            clickFn: function () {
                console.log('Commit1...');
            }
        });

        var radioButtonGroup = toolbar.addRadioButtonGroup(function (data) {
            console.log(JSON.stringify(data));
        });

        radioButtonGroup.addButton({
            title: 'Radio button 1',
            icon: 'glyphicon glyphicon-align-left',
            data: {type: '1'}
        });

        radioButtonGroup.addButton({
            title: 'Radio button 2',
            icon: 'glyphicon glyphicon-align-center',
            data: {type: '2'}
        });

        radioButtonGroup.addButton({
            title: 'Radio button 3',
            icon: 'glyphicon glyphicon-align-right',
            data: {type: '3'}
        });

        toolbar.addToggleButton({
            title: 'Toggle button',
            icon: 'glyphicon glyphicon-plane',
            clickFn: function (data, toggled) {
                console.log('toggled: ' + toggled);
            }
        });


        toolbar.addTextBox({
            prependContent: '<i class="glyphicon glyphicon-search"></i>&nbsp;',
            placeholder: 'Find...',
            textChangedFn: function (oldVal, newVal) {
                console.log(newVal);
            },
            onEnterFn: function (val) {
                console.log(val);
            }
        });

        var label1 = toolbar.addLabel();
        label1.text('Something:');

        toolbar.addCheckBox({
            title: 'BLA',
            checkChangedFn: function (data, checked) {
                console.log('checked: ' + checked + ', data: ' + JSON.stringify(data));
            }
        });

        var ddlCreate = toolbar.addDropDownButton({text: 'Create...'});
        ddlCreate.addButton({
            title: 'Create 1 item',
            icon: 'glyphicon glyphicon-plus-sign',
            text: '1 item',
            data: {howmany: 1},
            clickFn: function (data) {
                console.log(JSON.stringify(data));
            }
        });

        ddlCreate.addDivider();

        ddlCreate.addButton({
            title: 'Create 10 items',
            icon: 'glyphicon glyphicon-plus-sign',
            text: '10 items',
            data: {howmany: 10},
            clickFn: function (data) {
                console.log(JSON.stringify(data));
            }
        });

        ddlCreate.addCheckBox({
            text: 'check1',
            data: {idx: 1},
            checkChangedFn: function (data, isChecked) {
                console.log('checked: ' + isChecked + ' , ' + JSON.stringify(data));
            }
        });
    };

    return DefaultToolbar;
});
