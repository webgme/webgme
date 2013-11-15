/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['clientUtil',
    'text!./MetaTextEditorDialog.html',
    'codemirror',
    'css!./MetaTextEditorDialog'], function ( util,
                                                 metaTextEditorDialogTemplate,
                                                 CodeMirror) {

    var MetaTextEditorDialog;

    MetaTextEditorDialog = function () {

    };

    MetaTextEditorDialog.prototype.show = function (metaText, saveCallBack) {
        var self = this;

        this._initDialog(metaText, saveCallBack);

        this._dialog.modal('show');

        this._dialog.on('shown', function () {
            self._codeMirror.refresh();
            self._codeMirror.focus();
        });

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    MetaTextEditorDialog.prototype._initDialog = function (metaText, saveCallBack) {
        var self = this,
            closeSave,
            closeDelete,
            isValidConstraintName;

        closeSave = function () {
            self._dialog.modal('hide');

            if (saveCallBack) {
                saveCallBack.call(self, self._codeMirror.getValue());
            }
        };

        this._dialog = $(metaTextEditorDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();

        this._btnSave = this._dialog.find('.btn-save').first();

        this._pMeta = this._el.find('#pMeta').first();
        this._scriptEditor = this._pMeta.find('div.controls').first();


        //click on SAVE button
        this._btnSave.on('click', function (event) {
            closeSave();

            event.stopPropagation();
            event.preventDefault();
        });

        this._codeMirror = CodeMirror(this._scriptEditor[0], {
            value: metaText,
            mode:  "javascript"
        });
    };


    return MetaTextEditorDialog;
});