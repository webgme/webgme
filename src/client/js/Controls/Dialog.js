/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['text!./templates/Dialog.html'], function (dialogTemplate) {

    'use strict';

    var dialogBase = $(dialogTemplate);

    function showDialog(title, body, callback, btnCancel) {
        var btnOKClicked = false,
            dialog = dialogBase.clone(),

            lblTitle = dialog.find('.modal-header > h3'),
            dBody = dialog.find('.modal-body'),
            btnOK = dialog.find('.modal-footer > .btn-ok');

        lblTitle.text(title);
        dBody.html(body);

        //remove cancel button if not needed
        if (btnCancel !== true) {
            dialog.find('.modal-footer > .btn-cancel').remove();
            dialog.find('.modal-header > .close').remove();
        }

        dialog.on('shown.bs.modal', function () {
            btnOK.focus();
        });

        dialog.on('hidden.bs.modal', function () {
            dialog.remove();
            dialog.empty();
            dialog = undefined;

            if (btnOKClicked === true && callback) {
                callback();
            }
        });

        btnOK.on('click', function () {
            btnOKClicked = true;
            dialog.modal('hide');
        });

        dialog.modal('show');
    }

    function alert(title, body, callback) {
        showDialog(title, body, callback, false);
    }

    function confirm(title, body, callback) {
        showDialog(title, body, callback, true);
    }

    return {
        alert: alert,
        confirm: confirm
    };
});