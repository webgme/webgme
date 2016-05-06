/*globals define*/
/*jshint node:true, browser:true*/

/**
 * This plugin can be used for importing projects from webgme v1.x.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:ImportV1
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    './serialization',
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
     * Initializes a new instance of ImportV1.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ImportV1.
     * @constructor
     */
    function ImportV1() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ImportV1.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ImportV1.prototype = Object.create(PluginBase.prototype);
    ImportV1.prototype.constructor = ImportV1;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ImportV1.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            currentConfig = self.getCurrentConfig();

        if (currentConfig.type === 'ImportProject') {
            self.sendNotification('Importing Project', function (err) {
                if (err) {
                    self.logger.error('Failed sending notification');
                }
                self.importOrUpdateLibrary(currentConfig, callback);
            });
        } else if (currentConfig.type === 'ImportLibrary') {
            self.sendNotification('Importing Library', function (err) {
                if (err) {
                    self.logger.error('Failed sending notification');
                }
                self.importOrUpdateLibrary(currentConfig, callback);
            });
        } else if (currentConfig.type === 'UpdateLibrary') {
            self.sendNotification('Updating Library', function (err) {
                if (err) {
                    self.logger.error('Failed sending notification');
                }
                self.importOrUpdateLibrary(currentConfig, callback);
            });
        } else {
            callback(new Error('Unexpected type ' + currentConfig.type), self.result);
        }
    };

    // Importing
    ImportV1.prototype.importOrUpdateLibrary = function (currentConfig, callback) {
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
                        callback(new Error('Root path in json is not empty string and not exported from a ' +
                            'root node - use Import/UpdateLibrary'), self.result);
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

    ImportV1.prototype.getLibObjectAndUploadAssets = function (currentConfig, callback) {
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

    ImportV1.prototype.getLibObject = function (hash, callback) {
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

    return ImportV1;
});