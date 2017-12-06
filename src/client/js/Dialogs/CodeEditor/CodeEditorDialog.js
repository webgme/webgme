/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * Dialog for multiline string attribute editing, but can be
 * used for any codemirror based (and pop-up dialog styled) jobs
 *
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'codemirror',
    'ot',
    './constants',
    'common/Constants',
    'client/logger',
    'js/Loader/LoaderCircles',
    'js/Dialogs/Confirm/ConfirmDialog',
    './CLIENT_COLORS',
    'text!./templates/CodeEditorDialog.html',
    'css!./styles/CodeEditorDialog.css',
    'codemirror/addon/merge/merge',
    'css!codemirror/addon/merge/merge.css',
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
], function (CodeMirror, ot, CONSTANTS, COMMON, Logger, LoaderCircles, ConfirmDialog, CLIENT_COLORS, dialogTemplate) {
    'use strict';

    function CodeEditorDialog() {
        this._dialog = $(dialogTemplate);
        this._icon = this._dialog.find('.header-icon');
        this._contentDiv = this._dialog.find('.modal-content');
        this._saveBtn = this._dialog.find('.btn-save');
        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');
        this._compareBtn = this._dialog.find('.btn-compare');
        this._compareEl = this._dialog.find('.codemirror-compare');
    }

    CodeEditorDialog.prototype.show = function (params) {
        var self = this,
            codemirrorOptions = {
                readOnly: params.readOnly,
                lineNumbers: true,
                matchBrackets: true,
                fullscreen: false,
            },
            cmCompare,
            otherClients = {},
            intervalId,
            logger,
            oked,
            client,
            activeObject,
            docId;

        function hasDifferentValue() {
            return self._savedValue !== self._cm.getValue();
        }

        function save() {
            var newValue;
            if (params.readOnly || hasDifferentValue() === false) {
                return;
            }

            client.startTransaction();
            newValue = self._cm.getValue();
            self._activeSelection.forEach(function (id) {
                client.setAttribute(id, params.name, newValue);
            });

            client.completeTransaction();

            self._savedValue = newValue;
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
                    question: 'You made changes without saving. ' +
                    'Would you like to save those changes?',
                    okLabel: 'Yes',
                    cancelLabel: 'No',
                    onHideFn: function (yes) {
                        cb(yes);
                    }
                }, function () {

                });
            }
        }

        function isConnected(status) {
            return status === COMMON.STORAGE.CONNECTED || status === COMMON.STORAGE.RECONNECTED;
        }

        function newNetworkStatus(c, status) {
            var disconnectedAt,
                disconnectTimeout;

            if (status === COMMON.STORAGE.DISCONNECTED) {
                disconnectedAt = Date.now();
                disconnectTimeout = client.gmeConfig.documentEditing.disconnectTimeout;

                Object.keys(otherClients).forEach(function (id) {
                    if (otherClients[id].selection) {
                        otherClients[id].selection.clear();
                    }
                });

                intervalId = setInterval(function () {
                    $.notify({
                        icon: 'fa fa-exclamation-triangle',
                        message: 'Connection was lost. If not reconnected within ' +
                        Math.ceil((disconnectTimeout - (Date.now() - disconnectedAt)) / 1000) +
                        ' seconds, your changes could get lost.'
                    }, {
                        delay: 3000,
                        hideDuration: 0,
                        type: 'danger',
                        offset: {
                            x: 20,
                            y: 37
                        }
                    });
                }, disconnectTimeout / 10);
            } else if (isConnected(status)) {
                clearInterval(intervalId);
                $.notify({
                    message: 'Reconnected - all is fine.'
                }, {
                    delay: 3000,
                    hideDuration: 0,
                    type: 'success',
                    offset: {
                        x: 20,
                        y: 37
                    }
                });
            } else {
                clearInterval(intervalId);
                $.notify({
                    message: 'There were connection issues - the page needs to be refreshed. ' +
                    'Make sure to copy any entered text.'
                }, {
                    delay: 30000,
                    hideDuration: 0,
                    type: 'danger',
                    offset: {
                        x: 20,
                        y: 37
                    }
                });
            }
        }

        client = params.client || WebGMEGlobal.Client;
        logger = Logger.createWithGmeConfig('gme:Dialogs:CodeEditorDialog', client.gmeConfig);

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

        this._cm = CodeMirror.fromTextArea(this._dialog.find('.codemirror-editor').first().get(0), codemirrorOptions);
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

        self._compareEl.hide();
        this._compareBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (cmCompare) {
                cmCompare = null;
                self._compareEl.empty();
                self._compareEl.hide();
                $(self._cm.getWrapperElement()).show();
                self._cm.refresh();
            } else {
                $(self._cm.getWrapperElement()).hide();
                self._compareEl.show();
                cmCompare = CodeMirror.MergeView(self._compareEl.get(0), {
                    value: self._cm.getValue(),
                    readOnly: true,
                    origRight: self._savedValue || '',
                    lineNumbers: true,
                    mode: codemirrorOptions.mode,
                    showDifferences: true,
                    fullscreen: false,
                    revertButtons: false
                });
            }
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
                            logger.error(err);
                        }
                    });

                    client.removeEventListener(client.CONSTANTS.NETWORK_STATUS_CHANGED, newNetworkStatus);
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

        if (params.readOnly) {
            this._okBtn.hide();
            this._saveBtn.hide();
            this._compareBtn.hide();
            this._cm.setValue(params.value || '');
        } else {
            if (client.gmeConfig.documentEditing.enable === true &&
                isConnected(client.getNetworkStatus()) && this._activeSelection.length === 1) {

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
                        var colorIndex;

                        if (otherClients.hasOwnProperty(eData.socketId) === false) {
                            colorIndex = Object.keys(otherClients).length % CLIENT_COLORS.length;
                            otherClients[eData.socketId] = {
                                userId: eData.userId,
                                selection: null,
                                color: CLIENT_COLORS[colorIndex]
                            };
                        }

                        // Clear the current selection for that user...
                        if (otherClients[eData.socketId].selection) {
                            otherClients[eData.socketId].selection.clear();
                        }

                        // .. and if there is a new selection, set it in the editor.
                        if (eData.selection) {
                            otherClients[eData.socketId].selection = self._editor.setOtherSelection(eData.selection,
                                otherClients[eData.socketId].color, otherClients[eData.socketId].userId);
                        }
                    },
                    function (err, initData) {
                        if (err) {
                            logger.error(err);
                            return;
                        }

                        docId = initData.docId;
                        self._cm.setValue(initData.document);
                        self._editor.registerCallbacks({
                            'change': function (operation) {
                                client.sendDocumentOperation({
                                    docId: docId,
                                    operation: operation,
                                    selection: self._editor.getSelection()
                                });
                            },
                            'selectionChange': function () {
                                client.sendDocumentSelection({
                                    docId: docId,
                                    selection: self._editor.getSelection()
                                });
                            }
                        });
                        self._loader.stop();
                        $.notify({
                            message: 'A channel for close collaboration is open. Changes still have to be persisted' +
                            ' by saving.'
                        }, {
                            delay: 5000,
                            hideDuration: 0,
                            type: 'success',
                            offset: {
                                x: 20,
                                y: 37
                            }
                        });

                        client.addEventListener(client.CONSTANTS.NETWORK_STATUS_CHANGED, newNetworkStatus);
                    });
            } else {
                this._cm.setValue(params.value || '');
            }
        }
    };

    CodeEditorDialog.prototype.changeMode = function (event) {
        var modeSelect = event.target,
            mode = modeSelect.options[modeSelect.selectedIndex].textContent;
        this._cm.setOption('mode', CONSTANTS.MODE[mode]);
    };

    return CodeEditorDialog;
});
