/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['text!html/Controls/Dialog.html'], function (dialogTemplate) {

    var dialogBase = $(dialogTemplate);

    var _showDialog = function (title, body, callback, btnCancel) {
        var btnOKClicked = false;
        var dialog = dialogBase.clone();

        var lblTitle = dialog.find('.modal-header > h3');
        var dBody =  dialog.find('.modal-body');
        var btnOK = dialog.find('.modal-footer > .btn-ok');

        lblTitle.text(title);
        dBody.html(body);

        //remove cancel button if not needed
        if (btnCancel !== true) {
            dialog.find('.modal-footer > .btn-cancel').remove();
            dialog.find('.modal-header > .close').remove();
        }

        dialog.on('shown', function () {
            btnOK.focus();
        });

        dialog.on('hidden', function () {
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
    };

    var _alert = function (title, body, callback) {
        _showDialog(title, body, callback, false);
    };

    var _confirm = function (title, body, callback) {
        _showDialog(title, body, callback, true);
    };

    return {
        alert: _alert,
        confirm: _confirm
    };
});