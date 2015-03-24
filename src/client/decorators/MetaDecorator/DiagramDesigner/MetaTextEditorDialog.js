/*globals define, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/util',
    'text!./templates/MetaTextEditorDialog.html',
    'codemirror',
    'css!./styles/MetaTextEditorDialog.css'], function ( util,
                                                 metaTextEditorDialogTemplate,
                                                 CodeMirror) {

    "use strict";

    var MetaTextEditorDialog;

    MetaTextEditorDialog = function () {

    };

    MetaTextEditorDialog.prototype.show = function (metaText, saveCallBack) {
        var self = this;

        this._initDialog(metaText, saveCallBack);

        this._dialog.modal('show');

        this._dialog.on('shown.bs.modal', function () {
            self._codeMirror.refresh();
            self._codeMirror.focus();
        });

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    MetaTextEditorDialog.prototype._initDialog = function (metaText, saveCallBack) {
        var self = this,
            closeSave;

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