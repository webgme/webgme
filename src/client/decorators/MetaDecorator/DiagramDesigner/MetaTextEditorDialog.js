/*globals define, $*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/util',
    'text!./templates/MetaTextEditorDialog.html',
    'codemirror/lib/codemirror',
    'codemirror/mode/javascript/javascript',
    'css!./styles/MetaTextEditorDialog.css'
], function (util, metaTextEditorDialogTemplate, codeMirror) {

    'use strict';

    var MetaTextEditorDialog;

    MetaTextEditorDialog = function () {

    };

    MetaTextEditorDialog.prototype.show = function (gmeNode, metaText) {
        var self = this;

        this._initDialog(gmeNode, metaText);

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

    MetaTextEditorDialog.prototype._initDialog = function (gmeNode, metaText) {
        var self = this;

        this._dialog = $(metaTextEditorDialogTemplate);

        this._pMeta = this._dialog.find('#pMeta').first();
        this._pHeader = this._dialog.find('#pHeader').first();

        if (this._pHeader[0] && gmeNode) {
            this._pHeader[0].innerHTML = 'META definition of [' + gmeNode.getAttribute('name') + ']';
        }
        this._codeMirror = codeMirror(this._pMeta[0], {
            value: metaText,
            mode: 'javascript',
            readOnly: true
        });
    };

    return MetaTextEditorDialog;
});