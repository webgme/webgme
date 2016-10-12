/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/Dialogs/UIReplay/UIReplayDialog',
    'css!./styles/RecordReplayWidget.css'
], function (Logger, DropDownMenu, UIReplayDialog) {

    'use strict';

    var RecordReplayWidget,
        REC = WebGMEGlobal.recorder;

    RecordReplayWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:RecordReplayWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initialize();

        this._logger.debug('Created');
    };

    RecordReplayWidget.prototype._initialize = function () {
        var self = this;
        this._el.addClass('record-replay-widget');
        this._recording = false;

        this._dropDown = new DropDownMenu({
            dropUp: true,
            pullRight: true,
            size: 'micro',
            sort: true,
            icon: 'glyphicon glyphicon-facetime-video record-icon'
        });

        this._dropDown.setTitle('');

        this._el.append(this._dropDown.getEl());

        this._dropDown.onItemClicked = function (value) {
            if (value === 'rec') {
                self._atRecord();
            } else if (value === 'menu') {
                self._atMenuOpen();
            }
        };

        this._recBtn = this._dropDown.addItem({
            text: 'Start recording',
            value: 'rec'
        });

        this._menuBtn = this._dropDown.addItem({
            text: 'Open playback menu ...',
            value: 'menu'
        });

        this._client.addEventListener(this._client.CONSTANTS.PROJECT_CLOSED, function () {

        });

        this._client.addEventListener(this._client.CONSTANTS.PROJECT_CLOSED.BRANCH_CHANGED, function () {

        });
    };

    RecordReplayWidget.prototype._atRecord = function () {
        var self = this;
        self._recording = !self._recording;

        if (self._recording) {
            self._recBtn.find('a').text('Stop recording');
            self._menuBtn.hide();
            self._el.addClass('recording');
            REC.start();
        } else {
            self._recBtn.find('a').text('Start recording');
            self._menuBtn.show();
            self._el.removeClass('recording');
            REC.stop();
        }
    };

    RecordReplayWidget.prototype._atMenuOpen = function () {
        var self = this,
            dialog = new UIReplayDialog(self._logger);

        self._dropDown.setEnabled(false);
        dialog.show({}, function () {
            self._dropDown.setEnabled(true);
        });
    };

    return RecordReplayWidget;
});