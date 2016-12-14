/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    './UIRecorder',
    './UIRecorderDialog',
    'css!./styles/UIRecorder.css'
], function (Logger, DropDownMenu, UIRecorder, UIReplayDialog) {

    'use strict';

    var UIRecorderWidget;

    UIRecorderWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:UIRecorderWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;
        this.recorder = new UIRecorder(client);

        this._initialize();

        this._logger.debug('Created');
    };

    UIRecorderWidget.prototype._initialize = function () {
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

    UIRecorderWidget.prototype._atRecord = function () {
        var self = this;
        self._recording = !self._recording;

        if (self._recording) {
            self._recBtn.find('a').text('Stop recording');
            self._menuBtn.hide();
            self._el.addClass('recording');
            self.recorder.start();
        } else {
            self._recBtn.find('a').text('Start recording');
            self._menuBtn.show();
            self._el.removeClass('recording');
            self.recorder.stop();
        }
    };

    UIRecorderWidget.prototype._atMenuOpen = function () {
        var self = this,
            dialog = new UIReplayDialog(self._logger);

        self._dropDown.setEnabled(false);
        dialog.show({recorder: self.recorder}, function () {
            self._dropDown.setEnabled(true);
        });
    };

    return UIRecorderWidget;
});