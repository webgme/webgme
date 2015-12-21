/*globals define, $*/
/*jshint browser: true*/

/**
 * Dialog for confirmation of project deletion.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./templates/ConfirmDeleteDialog.html',
    'css!./styles/ConfirmDeleteDialog.css'
], function (dialogTemplate) {
    'use strict';

    function ConfirmDeleteDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._dontAsk = null;
        this._deleteItem = null;
    }

    ConfirmDeleteDialog.prototype.show = function (params, onOk) {
        var self = this;

        this._dialog = $(dialogTemplate);

        this._deleteItem = this._dialog.find('.delete-item');
        this._dontAsk = this._dialog.find('.do-not-ask-again');

        if (params.enableDontAskAgain !== true) {
            this._dontAsk.addClass('do-not-show');
        }

        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');

        this._deleteItem.text(params.deleteItem);

        this._okBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');

            onOk(self._dontAsk.find('input').is(':checked'));
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            self.onHide();
        });

        this._dialog.modal('show');
    };

    ConfirmDeleteDialog.prototype.onHide = function () {
        // Not overridden..
    };

    return ConfirmDeleteDialog;
});
