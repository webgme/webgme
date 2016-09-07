/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Dialog for confirmation of project deletion.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./templates/ValidVisualizersDialog.html',
    'css!./styles/ValidVisualizersDialog.css'
], function (dialogTemplate) {
    'use strict';

    function ValidVisualizersDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._infoBtn = null;
        this._infoSpan = null;
        this._result = null;
    }

    ValidVisualizersDialog.prototype.show = function (fnCallback, oldValue) {
        var self = this,
            client = WebGMEGlobal.Client;

        this._dialog = $(dialogTemplate);

        this._infoBtn = this._dialog.find('.toggle-info-btn');
        this._infoSpan = this._dialog.find('.info-message');
        this._alertDiv = this._dialog.find('.alert');
        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');

        this._dialog.find('#selected, #available').sortable({
            connectWith: '.connectedSortable'
        }).disableSelection();

        // Set events handlers
        this._infoBtn.on('click', function () {
            if (self._infoSpan.hasClass('hidden')) {
                self._infoSpan.removeClass('hidden');
            } else {
                self._infoSpan.addClass('hidden');
            }
        });

        this._okBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._result = 'ModelEditor';
            self._dialog.modal('hide');
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._dialog.on('hide.bs.modal', function () {
            self._okBtn.off('click');
            self._cancelBtn.off('click');
            self._infoBtn.off('click');
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            if (typeof self._result === 'string') {
                fnCallback(self._result);
            } else {
                fnCallback(oldValue);
            }
        });

        this._dialog.modal('show');
    };

    return ValidVisualizersDialog;
});
