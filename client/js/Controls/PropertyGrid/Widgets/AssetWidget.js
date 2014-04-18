"use strict";

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
        'blob/BlobClient'],
    function (WidgetBase,
              BlobClient) {

        var AssetWidget,
            LABEL_BASE = $('<span/>', {}),
            BTN_ATTACH = $('<a class="btn btn-mini btn-dialog-open"><i class="icon-file"/></a>'),
            INPUT_FILE_UPLOAD = $('<input type="file" />'),
            MAX_FILE_SIZE = 100000000,
            FILE_DROP_TARGET = $('<div class="fdt" />');

        AssetWidget = function (propertyDesc) {
            AssetWidget.superclass.call(this, propertyDesc);

            var self = this;

            this.__label = LABEL_BASE.clone();
            this.el.append(this.__label);

            this.__fileDropTarget = FILE_DROP_TARGET.clone();
            this.__fileDropTarget.css({'height': '22px',
                                        'width': '30px',
                                        'background-color': 'yellow',
                                        'display': 'inline-block'});
            this.el.append(this.__fileDropTarget);

            this.__btnAttach = BTN_ATTACH.clone();
            this.el.append(this.__btnAttach);


            this.__fileUploadInput = INPUT_FILE_UPLOAD.clone();

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
                self._fileSelectHandler(event.originalEvent);
            });

            this.updateDisplay();
        };

        AssetWidget.superclass = WidgetBase;

        _.extend(AssetWidget.prototype, WidgetBase.prototype);

        AssetWidget.prototype.updateDisplay = function () {
            this.__label.text(this.propertyValue);
            this.__label.attr('title', this.propertyValue);
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
        };

        AssetWidget.prototype._fileSelectHandler = function (event) {
            var btnAttach = this.__btnAttach.addClass("disabled"),
                self = this,
                j,
                file;

            // cancel event and hover styling
            event.stopPropagation();
            event.preventDefault();
            //this._fileDropTarget.removeClass('hover');

            btnAttach.addClass("disabled");
            btnAttach.off('click');

            // fetch FileList object
            var files = event.target.files || event.dataTransfer.files;

            // process all File objects
            if (files && files.length > 0) {
                this._readFilesAsync(files, function (result) {
                    var names = Object.keys(result),
                        i,
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
                            });
                        } else {
                            console.log('Uploading ' + names.length +' files...');
                            var afName = self.propertyID + new Date().toISOString().replace(':', '-').replace('.', '-');
                            var artifact = blobClient.createArtifact(afName);
                            self._addArtifactFiles(artifact, result, function (hashList) {
                                //self.setValue(JSON.stringify(hashList));
                                artifact.save(function (err, hash) {
                                    self.setValue(hash);
                                });
                            });
                        }
                    }

                    /*for (i = 0; i < names.length; i += 1) {
                        console.log(names[i] + ': ' + result[names[i]].size + ' bytes, content: ' + result[names[i]].content);
                    }*/
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