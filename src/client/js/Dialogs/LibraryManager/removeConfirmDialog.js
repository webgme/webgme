/**
 * @author kecso / https://github.com/kecso
 */
/*globals define, $*/
/*jshint browser: true*/

/**
 * Dialog for confirmation of library deletion.
 *
 */

define([
    'text!./templates/removeConfirmDialog.html'
], function (dialogTemplate) {
    'use strict';

    function RemoveConfirmDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._dontAsk = null;
        this._deleteItem = null;
    }

    RemoveConfirmDialog.prototype.show = function (params, onOk) {
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

    RemoveConfirmDialog.prototype.onHide = function () {
        // Not overridden..
    };

    return RemoveConfirmDialog;
});
