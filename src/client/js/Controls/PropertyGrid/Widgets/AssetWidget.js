/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase',
    'blob/BlobClient',
    'js/logger',
    'css!./styles/AssetWidget.css'
], function (WidgetBase,
             BlobClient,
             Logger) {

    'use strict';

    var AssetWidget,
        BTN_ATTACH = $('<a class="btn btn-mini btn-dialog-open"><i class="glyphicon glyphicon-file"/></a>'),
        INPUT_FILE_UPLOAD = $('<input type="file" />'),
        //MAX_FILE_SIZE = 100000000,
        ASSET_WIDGET_BASE = $('<div class="asset-widget" />'),
        ASSET_PROGRESS_BASE = $('<div class="upload-progress-bar" />'),
        ASSET_LINK = $('<a class="blob-download-link" href="" target="_self"/>');

    AssetWidget = function (propertyDesc) {
        WidgetBase.call(this, propertyDesc);
        this._logger = Logger.create('gme:js:Controls:PropertyGrid:Widgets:AssetWidget',
            WebGMEGlobal.gmeConfig.client.log);

        this.__el = ASSET_WIDGET_BASE.clone();
        this.el.append(this.__el);

        this.__progressBar = ASSET_PROGRESS_BASE.clone();
        this.__el.append(this.__progressBar);
        this.__progressBar.hide();

        this.__assetLink = ASSET_LINK.clone();
        this.__el.append(this.__assetLink);

        this.__fileDropTarget = this.__el;

        this.__btnAttach = BTN_ATTACH.clone();
        this.__el.append(this.__btnAttach);

        this.__fileUploadInput = INPUT_FILE_UPLOAD.clone();

        this.__files = [];

        this.__timeoutId = null;

        this._attachFileDropHandlers();

        this.updateDisplay();
    };

    AssetWidget.prototype = Object.create(WidgetBase.prototype);
    AssetWidget.prototype.constructor = AssetWidget;

    AssetWidget.prototype._attachFileDropHandlers = function () {
        var self = this;

        this.__btnAttach.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            self.__fileUploadInput.click();
        });

        // file select
        this.__fileUploadInput.on('change', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._fileSelectHandler(event.originalEvent);
        });

        //filedrag
        this.__fileDropTarget.on('dragover', function (event) {
            event.stopPropagation();
            event.preventDefault(); //IE 10 needs this to ba able to drop
        });

        this.__fileDropTarget.on('dragenter', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.__fileDropTarget.addClass('hover');
        });

        this.__fileDropTarget.on('dragleave', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.__fileDropTarget.removeClass('hover');
        });

        this.__fileDropTarget.on('drop', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.__fileDropTarget.removeClass('hover');
            self._fileSelectHandler(event.originalEvent);
        });
    };

    AssetWidget.prototype._detachFileDropHandlers = function () {
        // file select
        this.__fileUploadInput.off('change');

        //filedrag
        this.__fileDropTarget.off('dragover');
        this.__fileDropTarget.off('dragenter');
        this.__fileDropTarget.off('dragleave');
        this.__fileDropTarget.off('drop');

        this.__btnAttach.off('click');
    };

    AssetWidget.prototype.updateDisplay = function () {
        var bc = new BlobClient({logger: this._logger.fork('BlobClient')}),
            urlDownload = this.propertyValue ? bc.getDownloadURL(this.propertyValue) : '',
            text = this.propertyValue,

            self = this;

        this.__assetLink.text(text);
        this.__assetLink.attr('title', text);
        this.__assetLink.attr('href', urlDownload);

        if (this.propertyValue) {
            bc.getMetadata(this.propertyValue, function (err, fileInfo) {
                if (err) {
                    //TODO: more meaningful error message
                    text = 'ERROR...';
                } else {
                    text = fileInfo.name + ' (' + self._humanFileSize(fileInfo.size) + ')';
                }
                self.__assetLink.text(text);
                self.__assetLink.attr('title', text);
            });
        }

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    AssetWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this.__btnAttach) {
            if (this._isReadOnly === true) {
                this.__btnAttach.disable(true);
            } else {
                this.__btnAttach.disable(false);
            }
        }

        this._detachFileDropHandlers();
        if (this._isReadOnly !== true) {
            this._attachFileDropHandlers();
        }
    };

    AssetWidget.prototype._fileSelectHandler = function (event) {
        var self = this,
            blobClient,
            i,
            file,
            files,
            afName,
            artifact,
            remainingFiles,
            addedFileAsSoftLink;

        function uploadProgressHandler(fName, e) {
            var currentFile = self.__progressBar.text();
            if (self.__timeoutId) {
                return;
            }

            if (currentFile === '' || currentFile === fName) {
                if (typeof e.percent === 'number' && e.percent !== 100) {
                    self.__progressBar.width(e.percent + '%');
                    self.__progressBar.text(fName);
                } else {
                    self.__progressBar.text('');
                }
            } else if (e.percent === 100) {
                self.__progressBar.width(e.percent + '%');
                self.__progressBar.text(fName);
                self.__timeoutId = setTimeout(function () {
                    if (self.__progressBar) {
                        self.__progressBar.text('');
                        self.__progressBar.width(0);
                    }
                    self.__timeoutId = null;
                }, 500);
            }
        }

        function afterUpload(err, hash) {
            self.__assetLink.show();
            self.__progressBar.width(0);
            self.__progressBar.text('');
            self.__progressBar.hide();
            self.__timeoutId = null;

            if (err) {
                self._logger.error(err);
            } else {
                self.setValue(hash);
                self.fireFinishChange();
                self._attachFileDropHandlers(false);
            }
        }

        blobClient = new BlobClient({
            logger: this._logger.fork('BlobClient'),
            uploadProgressHandler: uploadProgressHandler
        });

        // cancel event and hover styling
        event.stopPropagation();
        event.preventDefault();

        // fetch FileList object
        files = event.target.files || event.dataTransfer.files;

        // process all File objects
        if (files && files.length > 0) {
            this.__files = files;
            this._detachFileDropHandlers(true);
            this.__assetLink.hide();
            this.__progressBar.show();

            afName = self.propertyName;
            artifact = blobClient.createArtifact(afName);

            remainingFiles = files.length;

            addedFileAsSoftLink = function (err, hash) {
                remainingFiles -= 1;

                if (err) {
                    //TODO: something went wrong, tell the user????
                } else {
                    // successfully uploaded
                }

                if (remainingFiles === 0) {
                    if (files.length > 1) {
                        artifact.save(function (err, artifactHash) {
                            afterUpload(err, artifactHash);
                        });
                    } else {
                        afterUpload(err, hash);
                    }
                }
            };

            for (i = 0; i < files.length; i += 1) {
                file = files[i];
                artifact.addFileAsSoftLink(file.name, file, addedFileAsSoftLink);
            }
        }
    };

    AssetWidget.prototype._humanFileSize = function (bytes, si) {
        var thresh = si ? 1000 : 1024,
            units = si ?
                ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] :
                ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'],
            u = -1;

        if (bytes < thresh) {
            return bytes + ' B';
        }

        do {
            bytes = bytes / thresh;
            u += 1;
        } while (bytes >= thresh);

        return bytes.toFixed(1) + ' ' + units[u];
    };

    AssetWidget.prototype.getTargetAsJson = function (callback) {
        var self = this,
            file,
            parsedContent = null,
            reader;

        if (this.__files && this.__files.length > 0) {
            file = this.__files[0];
            reader = new FileReader();

            reader.onload = function (e) {
                if (e.target && e.target.result) {
                    try {
                        parsedContent = JSON.parse(e.target.result);
                    } catch (exp) {
                        self._logger.error('failed to read asset on the client side', exp);
                        parsedContent = null;
                    }
                }

                callback(parsedContent);
            };

            reader.readAsText(file);

        } else {
            callback(null);
        }
    };

    AssetWidget.prototype.destroy = function () {
        this._detachFileDropHandlers();
        clearTimeout(this.__timeoutId);
        WidgetBase.prototype.destroy.call(this);
    };

    return AssetWidget;

});