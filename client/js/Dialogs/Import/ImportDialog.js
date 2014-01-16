/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager',
    'loaderCircles',
    'text!html/Dialogs/Import/ImportDialog.html',
    'js/NodePropertyNames',
    'css!/css/Dialogs/Import/ImportDialog'], function (logManager,
                                         LoaderCircles,
                                         importDialogTemplate,
                                         nodePropertyNames) {

    var ImportDialog,
        MAX_FILE_SIZE = 100000000;

    ImportDialog = function (client) {
        this._logger = logManager.create("ImportDialog");

        this._client = client;

        this._logger.debug("Created");
    };

    ImportDialog.prototype.show = function () {
        this._initDialog();

        this._dialog.modal('show');
    };

    ImportDialog.prototype._initDialog = function () {
        var self = this;

        this._dialog = $(importDialogTemplate);

        this._messagePanel = this._dialog.find('.fs-message');
        this._filePanel = this._dialog.find('.fs-selectfile');

        this._btnImport = this._dialog.find('.btn-import');
        this._btnImport.addClass("disabled");

        this._importTargetNodeLabel = this._dialog.find('.alert-info');

        this._importErrorLabel = this._dialog.find('.alert-error');
        this._importErrorLabel.hide();

        this._fileDropTarget = this._dialog.find('.file-drop-target');
        this._fileInput = this._dialog.find('#fileInput');

        this._txtImport = this._dialog.find('.txt-import');
        this._txtImport.hide();

        this._progressBarDiv = this._dialog.find('.progress-bar');

        this._loader = new LoaderCircles({"containerElement": this._filePanel});

        this._dialog.on('shown', function () {
            self._initImport();
        });

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    ImportDialog.prototype._initImport = function () {
        var importSourceNodeID = WebGMEGlobal.PanelManager.getActivePanel().getNodeID(),
            self = this;

        if (importSourceNodeID === undefined || importSourceNodeID === null) {
            this._messagePanel.remove();
            this._filePanel.remove();
            this._btnImport.remove();
            this._importTargetNodeLabel.text('Invalid import target object...');
            this._importTargetNodeLabel.removeClass('alert-info').addClass('alert-error');
        } else {
            this._importSourceNodeID = importSourceNodeID;
            var nodeName = importSourceNodeID;
            var obj = this._client.getNode(importSourceNodeID);
            if (obj) {
                nodeName = obj.getAttribute(nodePropertyNames.Attributes.name);
                if (!nodeName || nodeName === "") {
                    nodeName = importSourceNodeID;
                }
            }
            this._importTargetNodeLabel.text('Import target: ' + nodeName);

            // file select
            this._fileInput.on("change", function (event) {
                event.stopPropagation();
                event.preventDefault();
                self._fileSelectHandler(event.originalEvent);
            });

            //filedrag
            this._fileDropTarget.on('dragover', function (event) {
                event.stopPropagation();
                event.preventDefault();
                self._fileDropTarget.addClass('hover');
            });

            this._fileDropTarget.on('dragleave', function (event) {
                event.stopPropagation();
                event.preventDefault();
                self._fileDropTarget.removeClass('hover');
            });

            this._fileDropTarget.on("drop", function (event) {
                event.stopPropagation();
                event.preventDefault();
                self._fileSelectHandler(event.originalEvent);
            });
        }
    };

    ImportDialog.prototype._fileSelectHandler = function (event) {
        var loader = this._loader,
            btnImport = this._btnImport.addClass("disabled"),
            client = this._client,
            importSourceNodeID = this._importSourceNodeID,
            self = this;

        // cancel event and hover styling
        event.stopPropagation();
        event.preventDefault();
        this._fileDropTarget.removeClass('hover');

        btnImport.addClass("disabled");
        btnImport.off('click');

        // fetch FileList object
        var files = event.target.files || event.dataTransfer.files;

        var parsedJSONFileContent = undefined;

        // process all File objects
        if (files && files.length > 0) {
            files = files[0];
            if (files.size > MAX_FILE_SIZE) {
                self._displayMessage(files.name + ': File size is too big...', true);
            } else {
                //try to json parse it's content
                var reader = new FileReader();
                reader.onloadstart = function() {
                    loader.start();
                };

                reader.onloadend = function() {
                    loader.stop();
                };

                reader.onload = function(e) {
                    if (e.target && e.target.result){
                        try {
                            parsedJSONFileContent = JSON.parse(e.target.result);
                        } catch (expp) {
                            parsedJSONFileContent = undefined;
                        }
                    }

                    if (parsedJSONFileContent === undefined) {
                        self._displayMessage(files.name + ': Invalid file format...', true);
                    } else {
                        self._displayMessage(files.name + ': File has been parsed successfully, ready to import...', false);
                        btnImport.removeClass("disabled");
                        btnImport.on('click', function (event) {
                            event.preventDefault();
                            event.stopPropagation();

                            client.importNodeAsync(importSourceNodeID, parsedJSONFileContent, function (err) {
                               if (err) {
                                   self._displayMessage(files.name + ': Import failed: ' + err, true);
                               } else {
                                   self._displayMessage(files.name + ': Import successful...', false);
                               }
                            });
                        });
                    }
                };

                reader.readAsText(files);
            }
        } else {
            self._displayMessage('No file has been selected...', true);
        }
    };

    ImportDialog.prototype._displayMessage = function (msg, isError) {
        this._importErrorLabel.removeClass('alert-success').removeClass('alert-error');

        if (isError === true) {
            this._importErrorLabel.addClass('alert-error');
        } else {
            this._importErrorLabel.addClass('alert-success');
        }
        
        this._importErrorLabel.text(msg);
        this._importErrorLabel.hide();
        this._importErrorLabel.fadeIn();
    };

    return ImportDialog;
});