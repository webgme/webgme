/*globals define, $, WebGMEGlobal*/
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
    'js/Dialogs/Confirm/ConfirmDialog',
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
], function (CodeMirror, dialogTemplate, CONSTANTS, COMMON, ConfirmDialog) {
    'use strict';

    function CodeEditorDialog() {
        this._dialog = $(dialogTemplate);
        this._icon = this._dialog.find('.header-icon');
        this._contentDiv = this._dialog.find('.modal-content');
        this._saveBtn = this._dialog.find('.btn-save');
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
            oked,
            client,
            activeObject;

        function save() {

            if (params.readOnly) {
                return;
            }

            client.startTransaction();

            self._activeSelection.forEach(function (id) {
                client.setAttribute(id, params.name, self._editor.getValue());
            });

            client.completeTransaction();
        }

        function promptIfToToSave(cb) {
            var editorValue = self._editor.getValue(),
                hasDifferentValue = false,
                dialog,
                i,
                nodeObj;

            if (params.readOnly) {
                cb(false);
                return;
            }

            for (i = 0; i < self._activeSelection.length; i += 1) {
                nodeObj = client.getNode(self._activeSelection[i]);
                if (nodeObj && nodeObj.getOwnAttribute(params.name) !== editorValue) {
                    hasDifferentValue = true;
                    break;
                }
            }

            if (hasDifferentValue) {
                dialog = new ConfirmDialog();
                dialog.show({
                    severity: 'info',
                    iconClass: 'fa fa-floppy-o',
                    title: 'Save',
                    question: 'The saved value(s) at the current node(s) differ from the one in the editor. ' +
                        'Would you like to save the changes?',
                    okLabel: 'Yes',
                    cancelLabel: 'No',
                    onHideFn: function (yes) {
                        cb(yes);
                    }
                }, function () {

                });
            } else {
                cb(false);
            }
        }

        client = params.client || WebGMEGlobal.Client;
        this._savedValue = params.value;

        activeObject = params.activeObject || WebGMEGlobal.State.getActiveObject();
        this._activeSelection = params.activeSelection || WebGMEGlobal.State.getActiveSelection();

        if (!this._activeSelection || this._activeSelection.length === 0) {
            this._activeSelection = [activeObject];
        }

        // mode selector
        this._modeSelect = this._dialog.find('#mode_select').first();

        Object.keys(COMMON.ATTRIBUTE_MULTILINE_TYPES).forEach(function (type) {
            self._modeSelect.append($('<option/>').text(type));
        });

        if (COMMON.ATTRIBUTE_MULTILINE_TYPES.hasOwnProperty(params.multilineType)) {
            this._modeSelect.val(params.multilineType);
            if (params.multilineType !== COMMON.ATTRIBUTE_MULTILINE_TYPES.plaintext) {
                codemirrorOptions.mode = CONSTANTS.MODE[params.multilineType];
            }
        } else {
            this._modeSelect.val(COMMON.ATTRIBUTE_MULTILINE_TYPES.plaintext);
        }

        this._modeSelect.on('change', this.changeMode.bind(this));

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

        this._editor = CodeMirror.fromTextArea(this._dialog.find('#codemirror-area').first().get(0), codemirrorOptions);

        this._saveBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            save();
        });

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
            var doSave = false;

            function close() {
                if (doSave) {
                    save();
                }

                self._dialog.remove();
                self._dialog.empty();
                self._dialog = undefined;
            }

            if (typeof oked === 'boolean') {
                doSave = oked;
                close();
            } else {
                // If accidentally closed prompt to save if saved values are different.
                promptIfToToSave(function (save) {
                    doSave = save;
                    close();
                });
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
