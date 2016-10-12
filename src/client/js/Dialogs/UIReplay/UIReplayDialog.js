/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Dialog for recording and replaying changes made to a project.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./templates/UIReplayDialog.html',
    'css!./styles/UIReplayDialog.css'
], function (dialogTemplate) {
    'use strict';

    var REC = WebGMEGlobal.recorder,
        STATE_CHANGE_OPTIONS = {

        },
        COMMIT_CHANGE_OPTIONS = {

        };

    function UIReplayDialog(mainLogger) {
        this._logger = mainLogger.fork('UIReplayDialog');

        this._dialog = null;
        this._infoBtn = null;
        this._infoFooter = null;

        this._stepBackBtn = null;
        this._stepForwardBtn = null;
        this._playBtn = null;
        this._stopBtn = null;

        this._loadBtn = null;
        this._saveBtn = null;

        this._recBadge = null;

        this._playing = false;
    }

    UIReplayDialog.prototype.show = function (data, fnCallback) {
        var self = this;

        this._dialog = $(dialogTemplate);

        this._dialog.draggable({
            handle: '.modal-body'
        });

        this._stepBackBtn = this._dialog.find('.btn-step-back');
        this._playBtn = this._dialog.find('.btn-play');
        this._stopBtn = this._dialog.find('.btn-stop');
        this._stepForwardBtn = this._dialog.find('.btn-step-forward');

        if (REC.recording.length === 0) {
            this._playBtn.prop('disabled', true);
        }

        this._stopBtn.hide();
        this._loadBtn = this._dialog.find('.btn-load');
        this._saveBtn = this._dialog.find('.btn-save');

        this._recBadge = this._dialog.find('.rec-badge');
        this._recBadge.text(REC.recording.length);

        this._infoBtn = this._dialog.find('.toggle-info-btn');
        this._infoFooter = this._dialog.find('.modal-footer');

        // Set events handlers
        this._playBtn.on('click', function () {
            self.atPlay();
        });

        this._stopBtn.on('click', function () {
            self.atPlay();
        });

        this._stepForwardBtn.on('click', function () {
            self.atStep(true);
        });

        this._stepBackBtn.on('click', function () {
            self.atStep(false);
        });

        this._recBadge.on('click', function () {
            REC.clear();
            $(this).text(REC.recording.length);
        });

        this._infoBtn.on('click', function () {
            if (self._infoFooter.hasClass('hidden')) {
                self._infoFooter.removeClass('hidden');
            } else {
                self._infoFooter.addClass('hidden');
            }
        });

        this._dialog.on('hide.bs.modal', function () {
            self._infoBtn.off('click');
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            fnCallback();
        });

        this._dialog.modal('show');
    };

    UIReplayDialog.prototype.atPlay = function () {
        if (this._playing) {
            // Stop playback mode
            REC.stateIndex = -1;
            REC.commitIndex = -1;
            this._playBtn.show();
            this._stopBtn.hide();
            this._stepBackBtn.prop('disabled', true);
            this._stepForwardBtn.prop('disabled', true);
            this.setDisableLoaderSaver(false);
        } else {
            // Start playback mode
            this._playBtn.hide();
            this._stopBtn.show();
            this._stepForwardBtn.prop('disabled', false);
            this._stepBackBtn.prop('disabled', true);
            this.setDisableLoaderSaver(true);
        }

        this._playing = !this._playing;
    };

    UIReplayDialog.prototype.atStep = function (forward) {
        var self = this,
            promise;

        this._stopBtn.prop('disabled', true);
        this._stepForwardBtn.prop('disabled', true);
        this._stepBackBtn.prop('disabled', true);

        if (forward) {
            if (REC.stateIndex === REC.commitIndex) {
                promise = REC.stepForwardState(STATE_CHANGE_OPTIONS);
            } else {
                promise = REC.stepForwardCommit(COMMIT_CHANGE_OPTIONS);
            }
        } else {
            if (REC.stateIndex === REC.commitIndex) {
                promise = REC.stepBackCommit(COMMIT_CHANGE_OPTIONS);
            } else {
                promise = REC.stepBackState(STATE_CHANGE_OPTIONS);
            }
        }

        promise
            .then(function() {
                self._stopBtn.prop('disabled', false);
                if (REC.commitIndex < REC.recording.length - 1) {
                    self._stepForwardBtn.prop('disabled', false);
                }

                if (REC.stateIndex > 0) {
                    self._stepBackBtn.prop('disabled', false);
                }
            })
            .catch(function (err) {
                self._logger.error(err);
            });
    };

    UIReplayDialog.prototype.atSave = function () {

    };

    UIReplayDialog.prototype.atLoad = function () {

    };

    UIReplayDialog.prototype.setDisableLoaderSaver = function (disable) {
        this._loadBtn.disable(disable);
        this._saveBtn.disable(disable);
    };

    return UIReplayDialog;
});
