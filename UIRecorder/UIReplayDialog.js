/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Dialog for recording and replaying changes made to a project.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    './RecordReplayControllers',
    'text!./templates/UIReplayDialog.html'
], function (Logger, RecordReplayControllers, dialogTemplate) {
    'use strict';

    var STATE_CHANGE_OPTIONS = {

        },
        COMMIT_CHANGE_OPTIONS = {

        };

    function UIReplayDialog(mainLogger) {
        this._logger = mainLogger ? mainLogger.fork('UIReplayDialog') : Logger.create(
            'gme:UIReplayDialog:UIReplayDialog',
            WebGMEGlobal.gmeConfig.client.log);

        this._dialog = null;
        this._infoBtn = null;
        this._infoFooter = null;

        this._stepBackBtn = null;
        this._stepForwardBtn = null;
        this._playBtn = null;
        this._stopBtn = null;
        this._recBadge = null;

        this._playing = false;
    }

    UIReplayDialog.prototype.show = function (options, fnCallback) {
        var self = this;

        this._dialog = $(dialogTemplate);

        this._client = options.client;

        this._player = new RecordReplayControllers.Player(this._client);

        this._currentProjectId = this._client.getActiveProjectId();

        this._dialog.draggable({
            handle: '.modal-body'
        });

        this._stepBackBtn = this._dialog.find('.btn-step-back');
        this._playBtn = this._dialog.find('.btn-play');
        this._stopBtn = this._dialog.find('.btn-stop');
        this._stepForwardBtn = this._dialog.find('.btn-step-forward');

        this._playBtn.prop('disabled', true);

        this._stopBtn.hide();

        this._recBadge = this._dialog.find('.rec-badge');
        this._recBadge.text(self._player.recording.length);

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
            if (typeof fnCallback === 'function') {
                fnCallback();
            }
        });

        this._dialog.modal('show');

        this._player.loadRecordings(this._currentProjectId, options.startCommit, options.endCommit, 100,
            function (err, commits) {
                if (err) {
                    self._logger.error(err);
                } else {
                    self._recBadge.text(commits.length);
                    if (commits.length > 0) {
                        self._playBtn.prop('disabled', false);
                    }
                }
            }
        );
    };

    UIReplayDialog.prototype.atPlay = function () {
        if (this._playing) {
            // Stop playback mode
            this._player.stateIndex = -1;
            this._player.commitIndex = -1;
            this._playBtn.show();
            this._stopBtn.hide();
            this._stepBackBtn.prop('disabled', true);
            this._stepForwardBtn.prop('disabled', true);
        } else {
            // Start playback mode
            this._playBtn.hide();
            this._stopBtn.show();
            this._stepForwardBtn.prop('disabled', false);
            this._stepBackBtn.prop('disabled', true);
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
            if (self._player.stateIndex === self._player.commitIndex) {
                promise = self._player.stepForwardState(STATE_CHANGE_OPTIONS);
            } else {
                promise = self._player.stepForwardCommit(COMMIT_CHANGE_OPTIONS);
            }
        } else {
            if (self._player.stateIndex === self._player.commitIndex) {
                promise = self._player.stepBackCommit(COMMIT_CHANGE_OPTIONS);
            } else {
                promise = self._player.stepBackState(STATE_CHANGE_OPTIONS);
            }
        }

        promise
            .then(function() {
                self._stopBtn.prop('disabled', false);
                if (self._player.commitIndex < self._player.recording.length - 1) {
                    self._stepForwardBtn.prop('disabled', false);
                }

                if (self._player.stateIndex > 0) {
                    self._stepBackBtn.prop('disabled', false);
                }
            })
            .catch(function (err) {
                self._logger.error(err);
            });
    };

    return UIReplayDialog;
});
