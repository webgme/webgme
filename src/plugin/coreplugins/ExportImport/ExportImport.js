/*globals define*/
/*jshint node:true, browser:true*/

/**
 * This plugin can be used for importing and exporting (snapshots of) projects. In addition to
 * the exported json description it can bundle up all encountered assets in project tree. <br>
 * The generate zip file with blobs can be used as seed directly or the content can be imported
 * using this plugin. For the latter the files need to be extracted and dragged and drop onto
 * the configuration option "Import file(s)".
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:ExportImport
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/core/users/serialization',
    'blob/BlobMetadata',
    'blob/util',
    'q'
], function (PluginConfig,
             PluginBase,
             pluginMetadata,
             serialization,
             BlobMetadata,
             blobUtil,
             Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ExportImport.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ExportImport.
     * @constructor
     */
    function ExportImport() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ExportImport.metadata = pluginMetadata;

    // Prototypal inheritance from PluginBase.
    ExportImport.prototype = Object.create(PluginBase.prototype);
    ExportImport.prototype.constructor = ExportImport;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ExportImport.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            currentConfig = self.getCurrentConfig();

        if (currentConfig.type === 'Export') {
            self.sendNotification('Starting export from node path "' + self.core.getPath(self.activeNode) + '"',
                function (err) {
                    if (err) {
                        self.logger.error('Failed sending notification');
                    }
                    self.exportLibrary(currentConfig, callback);
                }
            );
        } else if (currentConfig.type === 'ImportProject') {
            self.importOrUpdateLibrary(currentConfig, callback);
        } else if (currentConfig.type === 'ImportLibrary') {
            self.importOrUpdateLibrary(currentConfig, callback);
        } else if (currentConfig.type === 'UpdateLibrary') {
            self.importOrUpdateLibrary(currentConfig, callback);
        } else {
            callback(new Error('Unexpected type ' + currentConfig.type), self.result);
        }
    };

    // Exporting
    ExportImport.prototype.exportLibrary = function (currentConfig, callback) {
        var self = this,
            artie,
            isProject = self.core.getPath(self.activeNode) === '',
            exportedFname,
            jsonStr;

        serialization.exportLibraryWithAssets(self.core, self.activeNode, function (err, result) {
            if (err) {
                callback(err, self.result);
                return;
            }

            artie = self.blobClient.createArtifact('exported');
            self.gatherAssets(currentConfig, artie, result.assets, function (err) {
                if (err) {
                    callback(err, self.result);
                    return;
                }


                jsonStr = JSON.stringify(result.projectJson, null, 4);
                if (isProject) {
                    exportedFname = 'project.json';
                    //self.logger.debug('Exported project:', result.projectJson);
                } else {
                    exportedFname = 'lib.json';
                    //self.logger.debug('Exported library:', result.projectJson);
                }

                artie.addFile(exportedFname, jsonStr, function (err) {
                    if (err) {
                        callback(err, self.result);
                        return;
                    }

                    artie.save(function (err, hash) {
                        if (err) {
                            callback(err, self.result);
                            return;
                        }

                        self.result.addArtifact(hash);
                        self.result.setSuccess(true);
                        callback(null, self.result);
                    });
                });
            });
        });
    };

    ExportImport.prototype.gatherAssets = function (currentConfig, artifact, assets, callback) {
        var self = this;

        if (currentConfig.assets === false) {
            self.logger.debug('No assets will be exported..');
            callback(null);
            return;
        }

        Q.allSettled(assets.map(function (assetInfo) {
            // assetInfo = {
            //  hash: value,
            //  attrName: names[i],
            //  nodePath: _core.getPath(node)
            // }
            return Q.ninvoke(self.blobClient, 'getMetadata', assetInfo.hash)
                .then(function (metadata) {
                    return self.gatherFilesFromMetadataHashRec(metadata, assetInfo.hash, artifact);
                });
        }))
            .then(function (result) {
                var i,
                    errDeferred,
                    errorCheckPromises = [],
                    error;

                for (i = 0; i < result.length; i += 1) {
                    if (result[i].state === 'rejected') {
                        error = result[i].reason instanceof Error ? result[i].reason : new Error(result[i].reason);
                        self.logger.debug('Gathering returned with error', assets[i], error);

                        if (error.message === 'Requested object does not exist: ' + assets[i].hash ||
                            error.message === 'Not Found') {
                            errorCheckPromises.push(self._checkIfAssetAttribute(assets[i]));
                        } else if (error.message.indexOf('Another content with the same name was already added.') > -1) {
                            self.logger.debug('Same .content or .metadata encountered, only adding one');
                        } else {
                            self.logger.error('Unhandled error for asset:', assets[i], error);
                            errDeferred = Q.defer(error);
                            errDeferred.reject(error);
                            errorCheckPromises.push(errDeferred.promise);
                        }
                    }
                }

                return Q.all(errorCheckPromises);
            })
            .then(function () {
                self.logger.info('artifact size', artifact.descriptor.size);
                callback(null);
            })
            .catch(callback);

    };

    ExportImport.prototype.gatherFilesFromMetadataHashRec = function (metadata, assetHash, artifact, callback) {
        var self = this,
            deferred = Q.defer(),
            filenameMetadata = assetHash + '.metadata',
            softLinkNames,
            filenameContent;

        self.logger.debug('gatherFilesFromMetadataHashRec, metadata:', metadata);

        if (metadata.contentType === BlobMetadata.CONTENT_TYPES.OBJECT) {
            filenameContent = assetHash + '.content';

            Q.ninvoke(artifact, 'addMetadataHash', filenameContent, assetHash, metadata.size)
                .then(function () {
                    return Q.ninvoke(artifact, 'addFile', filenameMetadata, JSON.stringify(metadata));
                })
                .then(function () {
                    deferred.resolve();
                })
                .catch(function (err) {
                    err = err instanceof Error ? err : new Error(err);
                    if (err.message.indexOf('Another content with the same name was already added.') > -1) {
                        deferred.resolve();
                    } else {
                        deferred.reject(new Error(err));
                    }
                });

        } else if (metadata.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
            // Add .metadata and .content for all linked soft-links (recursively).
            softLinkNames = Object.keys(metadata.content);
            Q.all(softLinkNames.map(function (softLinkName) {
                var softLinkMetadataHash = metadata.content[softLinkName].content;
                self.logger.debug('Complex object, softLinkMetadataHash:', softLinkMetadataHash);
                return Q.ninvoke(self.blobClient, 'getMetadata', softLinkMetadataHash)
                    .then(function (softLinkMetadata) {
                        return self.gatherFilesFromMetadataHashRec(softLinkMetadata, softLinkMetadataHash, artifact);
                    });
            }))
                .then(function () {
                    // Finally add the .metadata for the complex object.
                    return Q.ninvoke(artifact, 'addFile', filenameMetadata, JSON.stringify(metadata));
                })
                .then(function () {
                    deferred.resolve();
                })
                .catch(function (err) {
                    deferred.reject(new Error(err));
                });
        } else {
            deferred.reject(new Error('Unsupported content type', metadata.contentType));
        }

        return deferred.promise.nodeify(callback);
    };

    ExportImport.prototype._checkIfAssetAttribute = function (assetInfo, callback) {
        var deferred = Q.defer(),
            self = this;

        self.core.loadByPath(self.rootNode, assetInfo.nodePath, function (err, node) {
            if (err) {
                deferred.reject(err);
                return;
            }
            var attrDesc = self.core.getAttributeMeta(node, assetInfo.attrName);
            if (attrDesc && attrDesc.type === 'asset') {
                deferred.reject(new Error('Could not get meta data for asset: ', JSON.stringify(assetInfo)));
            } else {
                deferred.resolve();
            }
        });

        return deferred.promise.nodeify(callback);
    };

    // Importing
    ExportImport.prototype.importOrUpdateLibrary = function (currentConfig, callback) {
        var self = this,
            libraryRoot;

        self.getLibObjectAndUploadAssets(currentConfig)
            .then(function (libObject) {
                if (libObject === null) {
                    self.createMessage(self.activeNode, 'Library was not imported (still added any uploaded files).');
                    self.result.setSuccess(false);
                    callback(null, self.result);
                    return;
                }

                if (currentConfig.type === 'ImportLibrary') {
                    if (libObject.root.path === '') {
                        callback(new Error('Root path in json is empty string and exported from a root - ' +
                            'use ImportProject.'), self.result);
                        return;
                    }
                    libraryRoot = self.core.createNode({
                        parent: self.activeNode,
                        base: null
                    });
                    self.core.setAttribute(libraryRoot, 'name', 'Import Library');
                } else if (currentConfig.type === 'UpdateLibrary') {
                    if (libObject.root.path === '') {
                        callback(new Error('Root path in json is empty string and exported from a root - ' +
                            'use ImportProject.'), self.result);
                        return;
                    }
                    libraryRoot = self.activeNode;
                } else if (currentConfig.type === 'ImportProject') {
                    if (libObject.root.path !== '') {
                        callback(new Error('Root path in json is not empty string and not exported from a root node - ' +
                            'use Import/UpdateLibrary'), self.result);
                        return;
                    }
                    libraryRoot = self.rootNode;
                }

                self.logger.debug('Building up model...');
                serialization.import(self.core, libraryRoot, libObject, function (err) {
                    if (err) {
                        callback(err, self.result);
                        return;
                    }
                    self.save('Imported Library to "' + self.core.getPath(self.activeNode) + '"', function (err) {
                        if (err) {
                            callback(err, self.result);
                            return;
                        }
                        self.createMessage(self.activeNode, 'Library imported');
                        self.result.setSuccess(true);
                        callback(null, self.result);
                    });
                });
            })
            .catch(function (err) {
                callback(err, self.result);
            });
    };

    ExportImport.prototype.getLibObjectAndUploadAssets = function (currentConfig, callback) {
        var deferred = new Q.defer(),
            self = this;
        if (!currentConfig.file) {
            self.result.setError('Add at least the project json file when importing or updating.');
            deferred.reject(new Error('No file provided.'));
        } else {
            Q.ninvoke(self.blobClient, 'getMetadata', currentConfig.file)
                .then(function (mainMetadata) {
                    // Three cases:

                    //name: "project.json"
                    //contentType: "object"
                    //mime: "application/json"
                    //content: <blobHash>

                    //name: "file.zip"
                    //contentType: "complex"
                    //mime: "application/zip"
                    //content: {
                    //  <blobHash>.metadata: { content: <blobHash>, type: 'softLink'},
                    //  <blobHash>.content: { ... },
                    // ...}

                    //name: "exported.zip"
                    //contentType: "object"
                    //mime: "application/zip"
                    //content: <blobHash>

                    self.logger.debug('mainMetadata', mainMetadata);

                    if (mainMetadata.mime === 'application/json' &&
                        mainMetadata.contentType === BlobMetadata.CONTENT_TYPES.OBJECT) {

                        return self.getLibObject(currentConfig.file);
                    } else if (mainMetadata.mime === 'application/zip' &&
                        mainMetadata.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {

                        return blobUtil.addAssetsFromExportedProject(self.logger, self.blobClient, mainMetadata)
                            .then(function (projectFileHash) {
                                self.logger.debug('assets added, projectFileHash', projectFileHash);
                                if (projectFileHash) {
                                    return self.getLibObject(projectFileHash);
                                } else {
                                    return null;
                                }
                            });
                    } else if (mainMetadata.mime === 'application/zip' &&
                        mainMetadata.contentType === BlobMetadata.CONTENT_TYPES.OBJECT) {
                        throw new Error('Zip files not supported yet!' +
                            '[Drag the entire content from exported project.]');
                    } else {
                        throw new Error('Unexpected import file!');
                    }
                })
                .then(deferred.resolve)
                .catch(deferred.reject);
        }

        return deferred.promise.nodeify(callback);
    };

    ExportImport.prototype.getLibObject = function (hash, callback) {
        var self = this;

        return Q.ninvoke(self.blobClient, 'getObject', hash)
            .then(function (libOrBuf) {
                var libObject;

                if (typeof Buffer !== 'undefined' && libOrBuf instanceof Buffer) {
                    libOrBuf = String.fromCharCode.apply(null, new Uint8Array(libOrBuf));
                    libObject = JSON.parse(libOrBuf);
                } else {
                    libObject = libOrBuf;
                }

                self.logger.debug('gotLibraryObject', libObject);
                return libObject;
            })
            .nodeify(callback);
    };

    return ExportImport;
});