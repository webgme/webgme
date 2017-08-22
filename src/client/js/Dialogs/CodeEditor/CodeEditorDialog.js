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
    './constants',
    'common/Constants',
    'css!./styles/CodeEditorDialog.css',
    'codemirror/mode/clike/clike',
    'codemirror/mode/css/css',
    'codemirror/mode/erlang/erlang',
    'codemirror/mode/htmlmixed/htmlmixed',
    'codemirror/mode/javascript/javascript',
    'codemirror/mode/lua/lua',
    'codemirror/mode/stex/stex',
    'codemirror/mode/markdown/markdown',
    'codemirror/mode/mathematica/mathematica',
    'codemirror/mode/modelica/modelica',
    'codemirror/mode/sql/sql',
    'codemirror/mode/python/python',
    'codemirror/mode/ttcn/ttcn',
    'codemirror/mode/yaml/yaml'
], function (CodeMirror, dialogTemplate, CONSTANTS, COMMON) {
    'use strict';

    function CodeEditorDialog() {
        this._dialog = $(dialogTemplate);
        this._icon = this._dialog.find('.header-icon');
        this._contentDiv = this._dialog.find('.modal-content');
        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');
    }

    CodeEditorDialog.prototype.show = function (params) {
        var self = this,
            codemirrorOptions = {
                readOnly: params.readOnly,
                lineNumbers: true,
                matchBrackets: true,
                fullscreen: false,
            },
            oked = false;

        // mode selector
        this._modeSelect = this._dialog.find("#mode_select").first();
        $(this._modeSelect).val(params.multilineType || COMMON.ATTRIBUTE_MULTILINE_TYPES.plaintext);
        this._modeSelect.on('change', this.changeMode.bind(this));

        if (params.multilineType && params.multilineType !== COMMON.ATTRIBUTE_MULTILINE_TYPES.plaintext) {
            codemirrorOptions.mode = CONSTANTS.MODE[params.multilineType];
        }

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

        switch (params.multilineType) {
            default:

        }

        this._editor = CodeMirror.fromTextArea(this._dialog.find('#codemirror-area').first().get(0), codemirrorOptions);
        this._okBtn.on('click', function (event) {
            oked = true;
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });
        this._cancelBtn.on('click', function (event) {
            oked = false;
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

        this._dialog.on('shown.bs.modal', function () {
            self._editor.focus();
            self._editor.refresh();
        });

        this._dialog.modal('show');

        this._editor.setValue(params.value);

        if (params.readOnly) {
            this._okBtn.hide();
            this._cancelBtn.hide();
        }
    };

    CodeEditorDialog.prototype.changeMode = function (event) {
        var modeSelect = event.target,
            mode = modeSelect.options[modeSelect.selectedIndex].textContent;
        this._editor.setOption('mode', CONSTANTS.MODE[mode]);
    };

    return CodeEditorDialog;
});
