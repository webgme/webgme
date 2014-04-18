"use strict";

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
        'blob/BlobClient',
        'css!/css/Controls/PropertyGrid/Widgets/AssetWidget'],
    function (WidgetBase,
              BlobClient) {

        var AssetWidget,
            BTN_ATTACH = $('<a class="btn btn-mini btn-dialog-open"><i class="icon-file"/></a>'),
            INPUT_FILE_UPLOAD = $('<input type="file" />'),
            MAX_FILE_SIZE = 100000000,
            ASSET_WIDGET_BASE = $('<div class="asset-widget" />'),
            ASSET_LINK = $('<a href=""/>');

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
                bc.getInfo(this.propertyValue, function (err, fileInfo) {
                    if (err) {
                        //TODO: more meaningful error message
                        text = "ERROR...";
                    } else {
                        text = fileInfo.filename + ' (' + fileInfo.size +' bytes)';
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
                    this.__btnAttach.addClass('disabled');
                } else {
                    this.__btnAttach.removeClass('disabled');
                }
            }

            this._detachFileDropHandlers();
            if (isReadOnly !== true) {
                this._attachFileDropHandlers();
            }
        };

        AssetWidget.prototype._fileSelectHandler = function (event) {
            var self = this,
                file;

            // cancel event and hover styling
            event.stopPropagation();
            event.preventDefault();

            // fetch FileList object
            var files = event.target.files || event.dataTransfer.files;

            // process all File objects
            if (files && files.length > 0) {
                this._detachFileDropHandlers(true);

                this._readFilesAsync(files, function (result) {
                    var names = Object.keys(result),
                        blobClient = new BlobClient();

                    if (names && names.length > 0) {
                        if (names.length === 1) {
                            console.log('Uploading 1 file...');
                            blobClient.addObject(names[0], result[names[0]].content, function (err, hash) {
                                if (err) {
                                    //TODO: something went wrong, tell the user????
                                } else {
                                    self.setValue(hash);
                                }
                                self._attachFileDropHandlers(false);
                            });
                        } else {
                            console.log('Uploading ' + names.length +' files...');
                            var afName = self.propertyID + new Date().toISOString().replace(':', '-').replace('.', '-');
                            var artifact = blobClient.createArtifact(afName);
                            self._addArtifactFiles(artifact, result, function (/*hashList*/) {
                                artifact.save(function (err, hash) {
                                    self.setValue(hash);
                                    self._attachFileDropHandlers(false);
                                });
                            });
                        }
                    } else {
                        self._attachFileDropHandlers(false);
                    }
                });
            }
        };

        AssetWidget.prototype._readFilesAsync = function (files, fnCallback, contents, fileNum) {
            var file,
                self = this;

            contents = contents || {};

            if (fileNum === undefined) {
                fileNum = files.length - 1;
            }

            if (fileNum > -1) {
                //get the first file from the list and read it async
                file = files[fileNum];

                this._readOneFilesAsync(file, function (err, fileContent) {
                    contents[file.name] = {'err': err,
                        'size': file.size,
                        'content':  fileContent };
                    self._readFilesAsync(files, fnCallback, contents, fileNum-1);
                });
            } else {
                if (fnCallback) {
                    fnCallback(contents);
                }
            }
        };

        AssetWidget.prototype._readOneFilesAsync = function (file, fnCallback) {
            if (file.size > MAX_FILE_SIZE) {
                fnCallback('File to large, maximum allowed size is ' + MAX_FILE_SIZE + ' bytes...', undefined);
            } else {
                //try to json parse it's content
                var reader = new FileReader();
                reader.onloadstart = function() {
                };

                reader.onloadend = function() {
                };

                reader.onerror = function(error) {
                    fnCallback(error.message, undefined);
                };

                reader.onload = function(e) {
                    if (e.target && e.target.result){
                        fnCallback(undefined,  e.target.result);
                    }
                };

                //read the file
                setTimeout(function () {
                    reader.readAsText(file);
                }, 100);
            }
        };

        AssetWidget.prototype._addArtifactFiles = function (artifact, files, fnCallback, hashList) {
            var names = Object.keys(files),
                fileName,
                self = this;

            hashList = hashList || {};

            if (names.length > 0) {
                fileName = names[0];
                artifact.addFile(fileName, files[fileName].content, function (err, hash) {
                    if (err) {
                        //TODO: do what?
                        console.log('AddArtifactFile failed: ' + fileName + ' --> ' + err);
                    } else {
                        hashList[fileName] = hash;
                    }

                    delete files[fileName];
                    self._addArtifactFiles(artifact, files, fnCallback, hashList);
                });
            } else {
                if (fnCallback) {
                    fnCallback(hashList);
                }
            }
        };

        return AssetWidget;

    });