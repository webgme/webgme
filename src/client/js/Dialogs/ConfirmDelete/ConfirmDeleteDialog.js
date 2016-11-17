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
    }

    ConfirmDeleteDialog.prototype.show = function (params, onOk) {
        var self = this,
            inputChecker,
            value;

        this._dialog = $(dialogTemplate);

        this._contentDiv = this._dialog.find('.modal-content');
        this._dontAsk = this._contentDiv.find('.do-not-ask-again');
        this._icon = this._contentDiv.find('.header-icon');
        this._okBtn = this._contentDiv.find('.btn-ok');
        this._cancelBtn = this._contentDiv.find('.btn-cancel');
        this._inputForm = this._contentDiv.find('.form-horizontal');

        if (params.input) {
            this._inputForm.find('.input-group-addon').text(params.input.label);
            this._formControl = this._inputForm.find('.form-control');

            if (params.input.placeHolder) {
                self._formControl.attr('placeholder', params.input.placeHolder);
            }

            if (params.input.required) {
                self._okBtn.disable(true);
            }

            if (typeof params.input.checkFn === 'function') {
                inputChecker = params.input.checkFn;
            } else {
                inputChecker = function () {
                    return true;
                };
            }

            self._formControl.on('keyup', function () {
                var el = $(this);

                if (inputChecker(el.val())) {
                    el.parent().removeClass('has-error');
                    self._okBtn.disable(false);
                } else {
                    el.parent().addClass('has-error');
                    self._okBtn.disable(true);
                }

                value = el.val();
            });

            self._formControl.on('keydown', function (event) {
                var enterPressed = event.which === 13;

                if (enterPressed) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (inputChecker(value)) {
                        self._dialog.modal('hide');
                        onOk(self._dontAsk.find('input').is(':checked'), value);
                    }
                }
            });

        } else {
            this._inputForm.hide();
        }

        if (params.severity) {
            // info, warning
            this._contentDiv.addClass(params.severity);
            this._okBtn.addClass('btn-' + params.severity);
        } else {
            // danger by default
            this._okBtn.addClass('btn-danger');
        }

        if (params.enableDontAskAgain !== true) {
            this._dontAsk.addClass('do-not-show');
        }

        if (params.iconClass) {
            this._icon.addClass(params.iconClass);
        } else {
            this._icon.addClass('glyphicon glyphicon-trash');
        }

        if (params.title) {
            this._contentDiv.find('.title-text').text(params.title);
        }

        if (params.question) {
            this._contentDiv.find('.question-text').text(params.question);
        }

        if (params.deleteItem) {
            this._contentDiv.find('.delete-item').text(params.deleteItem);
        }

        this._okBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');

            onOk(self._dontAsk.find('input').is(':checked'), value);
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
