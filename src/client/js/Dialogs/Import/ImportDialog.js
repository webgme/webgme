/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/Loader/LoaderCircles',
    'text!./templates/ImportDialog.html',
    'css!./styles/ImportDialog.css'
], function (LoaderCircles,
             importDialogTemplate) {

    'use strict';

    var ImportDialog,
        MAX_FILE_SIZE = 100000000;

    ImportDialog = function () {
    };

    ImportDialog.prototype.show = function (fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;

        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;

            if (self._fnCallback && self._JSONContent) {
                self._fnCallback(self._JSONContent);
            }
        });

        this._dialog.modal('show');
    };

    ImportDialog.prototype._initDialog = function () {
        var self = this;

        this._dialog = $(importDialogTemplate);

        this._btnAttach = this._dialog.find('.btn-dialog-open');

        this._btnImport = this._dialog.find('.btn-import');
        this._btnImport.disable(true);

        this._importErrorLabel = this._dialog.find('.alert-error');
        this._importErrorLabel.hide();

        this._fileDropTarget = this._dialog.find('.file-drop-target');
        this._fileInput = this._dialog.find('#fileInput').hide();

        this._uploadedFileName = this._dialog.find('.uploaded-file-name');

        this._loader = new LoaderCircles({containerElement: this._dialog});

        // attach handlers

        this._btnAttach.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            self._fileInput.click();
        });


        // file select
        this._fileInput.on('change', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._fileSelectHandler(event.originalEvent);
        });

        //filedrag
        this._fileDropTarget.on('dragover', function (event) {
            event.stopPropagation();
            event.preventDefault(); //IE 10 needs this to ba able to drop
        });

        this._fileDropTarget.on('dragenter', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._fileDropTarget.addClass('hover');
        });

        this._fileDropTarget.on('dragleave', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._fileDropTarget.removeClass('hover');
        });

        this._fileDropTarget.on('drop', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._fileSelectHandler(event.originalEvent);
        });
    };

    ImportDialog.prototype._fileSelectHandler = function (event) {
        var loader = this._loader,
            btnImport = this._btnImport/*.addClass("disabled")*/,
            self = this;

        // cancel event and hover styling
        event.stopPropagation();
        event.preventDefault();
        this._fileDropTarget.removeClass('hover');

        btnImport.disable(true);
        btnImport.off('click');

        // fetch FileList object
        var file = event.target.files || event.dataTransfer.files;

        var parsedJSONFileContent;

        // process all File objects
        if (file && file.length > 0) {
            file = file[0];
            if (file.size > MAX_FILE_SIZE) {
                self._displayMessage(file.name + ':<br><br>FILE SIZE IS TOO BIG...', true);
            } else {
                //try to json parse it's content
                var reader = new FileReader();
                reader.onloadstart = function () {
                    loader.start();
                };

                reader.onloadend = function () {
                    loader.stop();
                };

                reader.onload = function (e) {
                    if (e.target && e.target.result) {
                        try {
                            parsedJSONFileContent = JSON.parse(e.target.result);
                        } catch (expp) {
                            parsedJSONFileContent = undefined;
                        }
                    }

                    self._uploadedFileName.text(file.name);
                    self._uploadedFileName.removeClass('empty');

                    if (parsedJSONFileContent === undefined) {
                        self._displayMessage('INVALID FILE FORMAT...', true);
                    } else {
                        self._displayMessage('File has been parsed successfully, click \'Import...\'' +
                                             ' to start importing.', false);
                        btnImport.disable(false);
                        btnImport.on('click', function (event) {
                            event.preventDefault();
                            event.stopPropagation();

                            self._JSONContent = parsedJSONFileContent;

                            self._dialog.modal('hide');
                        });
                    }
                };

                //read the file
                setTimeout(function () {
                    reader.readAsText(file);
                }, 100);
            }
        }
    };

    ImportDialog.prototype._displayMessage = function (msg, isError) {
        this._importErrorLabel.removeClass('alert-success').removeClass('alert-danger');

        if (isError === true) {
            this._importErrorLabel.addClass('alert-danger');
        } else {
            this._importErrorLabel.addClass('alert-success');
        }

        this._importErrorLabel.html(msg);
        this._importErrorLabel.hide();
        this._importErrorLabel.fadeIn();
    };

    return ImportDialog;
});