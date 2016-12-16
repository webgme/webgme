/*globals define, $*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
define([
    './RecordReplayControllers',
    './UIReplayDialog',
    'css!./styles/UIRecorder.css'
], function (RecordReplayControllers, UIReplayDialog) {
    'use strict';

    //var STATUS_CLASSES = 'loading success unavailable error';

    var CommitBadge = function (containerEl, client, params) {
        var self = this;
        this._client = client;
        this._commitHash = params.id;

        this._destroyed = false;
        this.$el = $('<i>', {
            class: 'fa fa-video-camera record-replay-commit-status-icon loading'
        });

        $(containerEl).append(this.$el);

        RecordReplayControllers.getStatus(client.getActiveProjectId(), this._commitHash, function (err, status) {
            if (self._destroyed) {
                return;
            }

            self.$el.removeClass('loading');

            if (err) {
                self.$el.addClass('error');
                self.$el.attr('title', 'Errored');
            } else if (status.exists === true) {
                self.$el.addClass('success');
                self.$el.attr('title', 'Start playback from this commit');
                self.$el.on('click', function () {
                    self._showReplayDialog();
                });
            } else {
                self.$el.addClass('unavailable');
                self.$el.attr('title', 'No recording available');
            }
        });
    };

    CommitBadge.prototype._showReplayDialog = function () {
        (new UIReplayDialog(this.client)).show({
            client: this._client,
            startCommit: this._client.getActiveCommitHash(),
            endCommit: this._commitHash
        });
    };

    CommitBadge.prototype.destroy = function () {
        this.$el.off('click');
        this._destroyed = true;
    };

    return CommitBadge;
});