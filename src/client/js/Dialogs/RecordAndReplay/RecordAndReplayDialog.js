/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Dialog for recording and replaying changes made to a project.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./templates/RecordAndReplayDialog.html',
    'css!./styles/RecordAndReplayDialog.css'
], function (dialogTemplate) {
    'use strict';

    function RecordAndReplayDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._infoBtn = null;
        this._infoSpan = null;
    }

    RecordAndReplayDialog.prototype.show = function (data, fnCallback) {
        var self = this;

        this._dialog = $(dialogTemplate);

        this._dialog.draggable({
            handle: '.modal-body'
        });

        this._infoBtn = this._dialog.find('.toggle-info-btn');
        this._infoSpan = this._dialog.find('.info-message');

        // Set events handlers
        this._infoBtn.on('click', function () {
            if (self._infoSpan.hasClass('hidden')) {
                self._infoSpan.removeClass('hidden');
            } else {
                self._infoSpan.addClass('hidden');
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

    return RecordAndReplayDialog;
});
