/*globals define, $*/
/*jshint browser: true*/
/**
 * Dialog for multiline string attribute editing, but can be
 * used for any codemirror based (and pop-up dialog styled) jobs
 *
 * @author kecso / https://github.com/kecso
 */

define([
    'codemirror',
    'text!./templates/CodeEditorDialog.html',
    'css!./styles/CodeEditorDialog.css'
], function (CodeMirror, dialogTemplate) {
    'use strict';

    function ConfirmDialog() {
        this._dialog = $(dialogTemplate);
        this._icon = this._contentDiv.find('.header-icon');
        this._contentDiv = this._dialog.find('.modal-content');
        this._okBtn = this._contentDiv.find('.btn-ok');
        this._cancelBtn = this._contentDiv.find('.btn-cancel');
        this._editor = CodeMirror.fromTextArea(this._dialog.find('#codemirror-area'), {
            lineNumbers: true
        });
    }

    ConfirmDialog.prototype.show = function (params) {
        var self = this,
            oked = false;

        if (params.iconClass) {
            this._icon.addClass(params.iconClass);
        } else {
            this._icon.addClass('glyphicon glyphicon-edit');
        }

        if (params.title) {
            this._contentDiv.find('.title-text').text(params.title);
        }

        if (typeof params.okLabel === 'string') {
            $(this._okBtn).text(params.okLabel);
        }

        if (typeof params.cancelLabel === 'string') {
            $(this._cancelBtn).text(params.cancelLabel);
        }

        this._okBtn.on('click', function (event) {
            oked = true;
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            if (typeof params.onHideFn === 'function') {
                params.onHideFn(oked, self._editor.getValue());
            }
        });

        this._dialog.modal('show');
    };

    return ConfirmDialog;
});
