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
    'ot',
    './constants',
    'common/Constants',
    'js/Loader/LoaderCircles',
    'js/Dialogs/Confirm/ConfirmDialog',
    'text!./templates/CodeEditorDialog.html',
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
], function (CodeMirror, ot, CONSTANTS, COMMON, LoaderCircles, ConfirmDialog, dialogTemplate) {
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
            currentSelections = {},
            oked,
            client,
            activeObject,
            docId;

        function hasDifferentValue() {
            var editorValue = self._cm.getValue(),
                nodeObj,
                i;

            for (i = 0; i < self._activeSelection.length; i += 1) {
                nodeObj = client.getNode(self._activeSelection[i]);
                if (nodeObj && nodeObj.getOwnAttribute(params.name) !== editorValue) {
                    return true;
                }
            }

            return false;
        }

        function save() {

            if (params.readOnly || hasDifferentValue() === false) {
                return;
            }

            client.startTransaction();

            self._activeSelection.forEach(function (id) {
                client.setAttribute(id, params.name, self._cm.getValue());
            });

            client.completeTransaction();
        }

        function promptIfToSave(cb) {
            var dialog;

            if (params.readOnly || hasDifferentValue() === false) {
                cb(false);
            } else {
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

        this._cm = CodeMirror.fromTextArea(this._dialog.find('#codemirror-area').first().get(0), codemirrorOptions);
        this._editor = new ot.CodeMirrorAdapter(this._cm);

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

                if (docId) {
                    client.unwatchDocument({docId: docId}, function (err) {
                        if (err) {
                            console.error(err);
                        }
                    });
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
                promptIfToSave(function (save) {
                    doSave = save;
                    close();
                });
            }
        });

        this._dialog.on('shown.bs.modal', function () {
            self._cm.focus();
            self._cm.refresh();
        });

        this._dialog.modal('show');

        this._loader = new LoaderCircles({containerElement: this._dialog});
        self._loader.start();

        client.watchDocument({
                projectId: client.getActiveProjectId(),
                branchName: client.getActiveBranchName(),
                nodeId: this._activeSelection[0],
                attrName: params.name,
                attrValue: params.value,
            },
            function atOperation(operation) {
                self._editor.applyOperation(operation);
            },
            function atSelection(eData) {
                if (currentSelections.hasOwnProperty(eData.clientId)) {
                    currentSelections[eData.clientId].clear();
                }

                currentSelections[eData.clientId] = self._editor.setOtherSelection(eData.selection,
                    '#0000ff', eData.clientId);
            },
            function (err, initData) {
                if (err) {
                    console.error(err);
                    return;
                }
                docId = initData.docId;
                self._cm.setValue(initData.str);
                self._editor.registerCallbacks({
                    'change': function (operation, inverse) {
                        //console.log(operation, inverse);
                        client.sendDocumentOperation({
                            docId: docId,
                            operation: operation,
                            selection: self._editor.getSelection()
                        });
                    }
                });
                self._loader.stop();
            });

        if (params.readOnly) {
            this._okBtn.hide();
            this._cancelBtn.hide();
        }
    };

    CodeEditorDialog.prototype.changeMode = function (event) {
        var modeSelect = event.target,
            mode = modeSelect.options[modeSelect.selectedIndex].textContent;
        this._cm.setOption('mode', CONSTANTS.MODE[mode]);
    };

    return CodeEditorDialog;
});
