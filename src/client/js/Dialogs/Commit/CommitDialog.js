/*globals define, WebGMEGlobal, $ */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define([
    'js/logger',
    'text!./templates/CommitDialog.html',
    'css!./styles/CommitDialog.css'
], function (Logger,
             commitDialogTemplate) {

    'use strict';

    var CommitDialog;

    CommitDialog = function (client) {
        this._logger = Logger.create('gme:Dialogs:Commit:CommitDialog', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;

        this._logger.debug('Created');
    };

    CommitDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.modal('show');

        this._dialog.on('shown.bs.modal', function () {
            self._txtMessage.focus();
        });

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    CommitDialog.prototype._initDialog = function () {
        var self = this,
            actualBranchName = this._client.getActiveBranchName();

        this._dialog = $(commitDialogTemplate);

        this._messagePanel = this._dialog.find('.fs-message');

        this._btnCommit = this._dialog.find('.btn-commit');

        this._branchAlertLabel = this._dialog.find('.alert');

        this._txtMessage = this._dialog.find('.txt-message');
        this._controlGroupMessage = this._dialog.find('.control-group-message');

        if (actualBranchName === undefined || actualBranchName === null) {
            this._messagePanel.remove();
            this._btnCommit.remove();
        } else {
            this._branchAlertLabel.removeClass('alert-error').addClass('alert-info');
            this._branchAlertLabel.text(actualBranchName);
        }

        self._controlGroupMessage.addClass('has-error');
        self._btnCommit.disable(true);

        this._txtMessage.on('keyup', function () {
            var val = self._txtMessage.val();
            if (val === '') {
                self._controlGroupMessage.addClass('has-error');
                self._btnCommit.disable(true);
            } else {
                self._controlGroupMessage.removeClass('has-error');
                self._btnCommit.disable(false);
            }
        });

        this._btnCommit.on('click', function () {
            var val = self._txtMessage.val();
            if (val !== '') {
                self._btnCommit.off('click').hide();
                self._logger.error('TODO: Make commit not supported/implemented.');
                //self._client.commitAsync({message: val}, function () {
                //    self._dialog.modal('hide');
                //});
            }
        });
    };

    return CommitDialog;
});