/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog',
    './RecordReplayControllers',
    'css!./styles/UIRecorder.css'
], function (Logger, DropDownMenu, ProjectRepositoryDialog, RecordReplayControllers) {

    'use strict';

    function UIRecorderWidget(containerEl, client) {
        this._logger = Logger.create('gme:Widgets:UIRecorderWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initialize();

        this._logger.debug('Created');
    }

    UIRecorderWidget.prototype._initialize = function () {
        var self = this;
        this._el.addClass('record-replay-widget');

        this._dropDown = new DropDownMenu({
            dropUp: true,
            pullRight: true,
            size: 'micro',
            sort: true,
            icon: 'glyphicon glyphicon-facetime-video record-icon'
        });

        this._dropDown.setTitle('');
        self._el.addClass('recording');

        this._el.append(this._dropDown.getEl());

        this._onProjectOpen = function (_client, data) {
            //TODO: Check latest committers.
        };

        this._onNewCommit = function (_client, cData) {
            RecordReplayControllers.addRecording(cData, function (err) {
                if (err) {
                    self._logger.error(err);
                }
            });
        };

        this._client.addEventListener(this._client.CONSTANTS.PROJECT_OPENED, this._onProjectOpen);
        this._client.addEventListener(this._client.CONSTANTS.NEW_COMMIT_STATE, this._onNewCommit);

        this._dropDown.onDropDownMenuOpen = function () {
            var dialog,
                options = {
                    branches: [],
                    start: self._client.getActiveBranchName()
                };

            dialog = new ProjectRepositoryDialog(self._client);
            dialog.show(options);
        };
    };

    UIRecorderWidget.prototype.destroy = function () {
        this._client.removeEventListener(this._client.CONSTANTS.PROJECT_OPENED, this._onProjectOpen);
        this._client.removeEventListener(this._client.CONSTANTS.NEW_COMMIT_STATE, this._onNewCommit);
    };

    return UIRecorderWidget;
});