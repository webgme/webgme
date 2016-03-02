/*globals define, $*/
/*jshint browser: true*/

/**
 * Dialog for confirmation of project deletion.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./templates/ExportErrorsDialog.html',
    'css!./styles/ExportErrorsDialog.css'
], function (dialogTemplate) {
    'use strict';

    function ExportErrorsDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._reassignBtn = null;
    }

    ExportErrorsDialog.prototype.show = function (client, logger, projectId, commitHash, text, onOk) {
        var self = this;

        this._dialog = $(dialogTemplate);

        this._messageBody = this._dialog.find('#messageContent');

        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');
        this._reassignBtn = this._dialog.find('.btn-warning');

        this._messageBody.html(text.replace(/\n/g, '<br/>'));

        this._okBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');

            onOk();
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._reassignBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            client.reassignGuids(projectId, commitHash, function (err) {
                if (err) {
                    logger.error('GUID reallocation failed', err);
                }
                self._dialog.modal('hide');
            });

        });

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            self.onHide();
        });

        this._dialog.modal('show');
    };

    ExportErrorsDialog.prototype.onHide = function () {
        // Not overridden..
    };

    return ExportErrorsDialog;
});
