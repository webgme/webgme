/*globals define, $*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
define(['./RecordReplayControllers', 'css!./styles/UIRecorder.css'], function (RecordReplayControllers) {
    'use strict';

    //var STATUS_CLASSES = 'loading success unavailable error';

    var CommitBadge = function (containerEl, client, params) {
        var self = this;
        this.client = client;

        this._destroyed = false;
        this.$el = $('<i>', {
            class: 'fa fa-video-camera record-replay-commit-status-icon loading'
        });

        $(containerEl).append(this.$el);

        RecordReplayControllers.getStatus(client.getActiveProjectId(), params.id, function (err, status) {
            if (self._destroyed) {
                return;
            }

            self.$el.removeClass('loading');

            if (err) {
                self.$el.addClass('error');
                self.$el.attr('title', 'Something went wrong..');
            } else if (status.exists === true) {
                self.$el.addClass('success');
                self.$el.attr('title', 'Start playback from this commit');
                // TODO: Add click handler
            } else {
                self.$el.addClass('unavailable');
                self.$el.attr('title', 'No recording available');
            }
        });
    };

    CommitBadge.prototype.destroy = function () {
        console.log('destroyed');
        this._destroyed = true;
    };

    return CommitBadge;
});