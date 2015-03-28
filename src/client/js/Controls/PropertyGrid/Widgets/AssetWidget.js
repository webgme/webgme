/*globals define, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
        'blob/BlobClient',
        'css!./styles/AssetWidget.css'],

    function (WidgetBase,
              BlobClient) {

        "use strict";

        var AssetWidget,
            BTN_ATTACH = $('<a class="btn btn-mini btn-dialog-open"><i class="glyphicon glyphicon-file"/></a>'),
            INPUT_FILE_UPLOAD = $('<input type="file" />'),
            MAX_FILE_SIZE = 100000000,
            ASSET_WIDGET_BASE = $('<div class="asset-widget" />'),
            ASSET_LINK = $('<a href="" target="_blank"/>');

        AssetWidget = function (propertyDesc) {
            AssetWidget.superclass.call(this, propertyDesc);

            this.__el = ASSET_WIDGET_BASE.clone();
            this.el.append(this.__el);

            this.__assetLink = ASSET_LINK.clone();
            this.__el.append(this.__assetLink);

            this.__fileDropTarget = this.__el;

            this.__btnAttach = BTN_ATTACH.clone();
            this.__el.append(this.__btnAttach);

            this.__fileUploadInput = INPUT_FILE_UPLOAD.clone();

            this._attachFileDropHandlers();

            this.updateDisplay();
        };

        AssetWidget.superclass = WidgetBase;

        _.extend(AssetWidget.prototype, WidgetBase.prototype);

        AssetWidget.prototype._attachFileDropHandlers = function () {
            var self = this;

            this.__btnAttach.on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();

                self.__fileUploadInput.click();
            });

            // file select
            this.__fileUploadInput.on("change", function (event) {
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

            this.__fileDropTarget.on("drop", function (event) {
                event.stopPropagation();
                event.preventDefault();
                self.__fileDropTarget.removeClass('hover');
                self._fileSelectHandler(event.originalEvent);
            });
        };

        AssetWidget.prototype._detachFileDropHandlers = function () {
            // file select
            this.__fileUploadInput.off("change");

            //filedrag
            this.__fileDropTarget.off('dragover');
            this.__fileDropTarget.off('dragenter');
            this.__fileDropTarget.off('dragleave');
            this.__fileDropTarget.off("drop");

            this.__btnAttach.off('click');
        };



        AssetWidget.prototype.updateDisplay = function () {
            var bc = new BlobClient();
            var urlDownload = this.propertyValue ? bc.getDownloadURL(this.propertyValue) : '';
            var text = this.propertyValue;

            var self = this;

            this.__assetLink.text(text);
            this.__assetLink.attr('title', text);
            this.__assetLink.attr('href', urlDownload);

            if (this.propertyValue) {
                bc.getMetadata(this.propertyValue, function (err, fileInfo) {
                    if (err) {
                        //TODO: more meaningful error message
                        text = "ERROR...";
                    } else {
                        text = fileInfo.name + ' (' + self._humanFileSize(fileInfo.size) +')';
                    }
                    self.__assetLink.text(text);
                    self.__assetLink.attr('title', text);
                });
            }

            return AssetWidget.superclass.prototype.updateDisplay.call(this);
        };

        AssetWidget.prototype.setReadOnly = function (isReadOnly) {
            AssetWidget.superclass.prototype.setReadOnly.call(this, isReadOnly);

            if (this.__btnAttach) {
                if (isReadOnly === true) {
                    this.__btnAttach.disable(true);
                } else {
                    this.__btnAttach.disable(false);
                }
            }

            this._detachFileDropHandlers();
            if (isReadOnly !== true) {
                this._attachFileDropHandlers();
            }
        };

        AssetWidget.prototype._fileSelectHandler = function (event) {
            var self = this,
                blobClient = new BlobClient(),
                i,
                file;

            // cancel event and hover styling
            event.stopPropagation();
            event.preventDefault();

            // fetch FileList object
            var files = event.target.files || event.dataTransfer.files;

            // process all File objects
            if (files && files.length > 0) {
                this._detachFileDropHandlers(true);

                var afName = self.propertyName;
                var artifact = blobClient.createArtifact(afName);

                var remainingFiles = files.length;

                for (i = 0; i < files.length; i += 1) {
                    file = files[i];
                    artifact.addFileAsSoftLink(file.name, file, function (err, hash) {
                        remainingFiles -= 1;

                        if (err) {
                            //TODO: something went wrong, tell the user????
                        } else {
                            // successfully uploaded
                        }

                        if (remainingFiles === 0) {
                            if (files.length > 1) {
                                artifact.save(function (err, artifactHash) {
                                    self.setValue(artifactHash);
                                    self.fireFinishChange();
                                    self._attachFileDropHandlers(false);
                                });

                            } else {
                                self.setValue(hash);
                                self.fireFinishChange();
                                self._attachFileDropHandlers(false);
                            }
                        }
                    });
                }
            }
        };

        AssetWidget.prototype._humanFileSize = function (bytes, si) {
            var thresh = si ? 1000 : 1024;
            if (bytes < thresh) {
                return bytes + ' B';
            }

            var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];

            var u = -1;

            do {
                bytes = bytes / thresh;
                u += 1;
            } while(bytes >= thresh);

            return bytes.toFixed(1) + ' ' + units[u];
        };

        return AssetWidget;

    });