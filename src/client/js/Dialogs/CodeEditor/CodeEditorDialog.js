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
            territory = {},
            uiId,
            intervalId,
            logger,
            oked,
            client,
            activeObject,
            docId;

        function growl(msg, level, delay) {
            $.notify({
                icon: level === 'danger' ? 'fa fa-exclamation-triangle' : '',
                message: msg
            }, {
                delay: delay,
                hideDuration: 0,
                type: level,
                offset: {
                    x: 20,
                    y: 37
                }
            });
        }

        function nodeEventHandler(events) {
            var newAttr,
                i,
                nodeObj;

            for (i = 0; i < events.length; i += 1) {
                if (events[i].etype === 'load') {
                    //nodeObj = client.getNode(events[i].eid);
                } else if (events[i].etype === 'update') {
                    nodeObj = client.getNode(events[i].eid);
                    newAttr = nodeObj.getAttribute(params.name);
                    if (self._storedValue !== newAttr) {
                        growl('Stored value was updated', 'info', 1000);
                        self._storedValue = newAttr;
                    }
                } else if (events[i].etype === 'unload') {
                    growl('Node was deleted! Make sure to copy your text to preserve changes.', 'danger', 10000);
                } else {
                    // "Technical events" not used.
                }
            }
        }

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
                    var msg = 'Connection was lost. If not reconnected within ' +
                        Math.ceil((disconnectTimeout - (Date.now() - disconnectedAt)) / 1000) +
                        ' seconds, your changes could get lost.';

                    growl(msg, 'danger', 3000);
                }, disconnectTimeout / 10);
            } else if (isConnected(status)) {
                clearInterval(intervalId);
                growl('Reconnected - all is fine.', 'success', 3000);
            } else {
                clearInterval(intervalId);
                growl('There were connection issues - the page needs to be refreshed. ' +
                    'Make sure to copy any text you would like to preserve.', 'danger', 30000);
            }
        }

        client = params.client || WebGMEGlobal.Client;
        logger = Logger.createWithGmeConfig('gme:Dialogs:CodeEditorDialog', client.gmeConfig);

        this._savedValue = params.value;
        this._storedValue = params.value;

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

        this._modeSelect.on('change', function (event) {
            var modeSelect = event.target,
                mode = modeSelect.options[modeSelect.selectedIndex].textContent;

            self._cm.setOption('mode', CONSTANTS.MODE[mode]);

            // TODO: How to update options for cm-merge?
            // if (cmCompare) {
            //     cmCompare.setOption('mode', CONSTANTS.MODE[mode]);
            // }
        });

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
                self._compareBtn.text('Compare');
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
                self._compareBtn.text('Edit');
            }
        });

        this._dialog.on('hide.bs.modal', function (e) {
            var doSave = false;

            function close() {
                if (doSave) {
                    save();
                }

                if (uiId) {
                    client.removeUI(uiId);
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

            if (typeof oked === 'boolean' || params.readOnly || hasDifferentValue() === false) {
                doSave = oked;
                close();
            } else {
                growl('You made changes without saving - you cannot exit without deciding whether to save or not',
                    'warning', 4000);
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        });

        this._dialog.on('shown.bs.modal', function () {
            self._cm.focus();
            self._cm.refresh();
        });

        this._dialog.modal({show: true});

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
                            growl(err.message, 'danger', 5000);
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
                        growl('A channel for close collaboration is open. Changes still have to be ' +
                            'persisted by saving.', 'success', 5000);
                        client.addEventListener(client.CONSTANTS.NETWORK_STATUS_CHANGED, newNetworkStatus);
                    });
            } else {
                this._cm.setValue(params.value || '');
            }

            territory[this._activeSelection[0]] = {children: 0};
            uiId = client.addUI(null, nodeEventHandler);
            client.updateTerritory(uiId, territory);
        }
    };

    return CodeEditorDialog;
});
