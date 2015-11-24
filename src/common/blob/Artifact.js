/*globals define*/
/*jshint browser: true, node:true*/

/*
 * @author lattmann / https://github.com/lattmann
 */

define([
    'blob/BlobMetadata',
    'blob/BlobConfig',
    'common/core/tasync',
    'q'
], function (BlobMetadata, BlobConfig, tasync, Q) {
    'use strict';

    /**
     * Creates a new instance of artifact, i.e. complex object, in memory. This object can be saved in the storage.
     * @param {string} name Artifact's name without extension
     * @param {blob.BlobClient} blobClient
     * @param {blob.BlobMetadata} descriptor
     * @constructor
     * @alias Artifact
     */
    var Artifact = function (name, blobClient, descriptor) {
        this.name = name;
        this.blobClient = blobClient;
        this.blobClientPutFile = tasync.unwrap(tasync.throttle(tasync.wrap(blobClient.putFile), 5));
        this.blobClientGetMetadata = tasync.unwrap(tasync.throttle(tasync.wrap(blobClient.getMetadata), 5));
        // TODO: use BlobMetadata class here
        this.descriptor = descriptor || {
                name: name + '.zip',
                size: 0,
                mime: 'application/zip',
                content: {},
                contentType: 'complex'
            }; // name and hash pairs
    };

    /**
     * Adds content to the artifact as a file.
     * @param {string} name filename
     * @param {Blob} content File object or Blob
     * @param {function(err, hash)} callback
     */
    Artifact.prototype.addFile = function (name, content, callback) {
        var self = this,
            filename = name.substring(name.lastIndexOf('/') + 1),
            deferred = Q.defer();

        self.blobClientPutFile.call(self.blobClient, filename, content, function (err, hash) {
            if (err) {
                deferred.reject(err);
                return;
            }

            self.addObjectHash(name, hash, function (err, hash) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                deferred.resolve(hash);
            });
        });

        return deferred.promise.nodeify(callback);
    };

    Artifact.prototype.addFileAsSoftLink = function (name, content, callback) {
        var deferred = Q.defer(),
            self = this,
            filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClientPutFile.call(self.blobClient, filename, content,
            function (err, hash) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                var size;
                if (content.size !== undefined) {
                    size = content.size;
                }
                if (content.length !== undefined) {
                    size = content.length;
                }

                self.addMetadataHash(name, hash, size)
                    .then(deferred.resolve)
                    .catch(deferred.reject);
            });

        return deferred.promise.nodeify(callback);
    };

    /**
     * Adds a hash to the artifact using the given file path.
     * @param {string} name Path to the file in the artifact. Note: 'a/b/c.txt'
     * @param {string} hash Metadata hash that has to be added.
     * @param callback
     */
    Artifact.prototype.addObjectHash = function (name, hash, callback) {
        var self = this,
            deferred = Q.defer();

        if (BlobConfig.hashRegex.test(hash) === false) {
            deferred.reject('Blob hash is invalid');
        } else {
            self.blobClientGetMetadata.call(self.blobClient, hash, function (err, metadata) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                if (self.descriptor.content.hasOwnProperty(name)) {
                    deferred.reject('Another content with the same name was already added. ' +
                        JSON.stringify(self.descriptor.content[name]));

                } else {
                    self.descriptor.size += metadata.size;

                    self.descriptor.content[name] = {
                        content: metadata.content,
                        contentType: BlobMetadata.CONTENT_TYPES.OBJECT
                    };
                    deferred.resolve(hash);
                }
            });
        }

        return deferred.promise.nodeify(callback);
    };

    Artifact.prototype.addMetadataHash = function (name, hash, size, callback) {
        var self = this,
            deferred = Q.defer(),
            addMetadata = function (size) {
                if (self.descriptor.content.hasOwnProperty(name)) {
                    deferred.reject('Another content with the same name was already added. ' +
                        JSON.stringify(self.descriptor.content[name]));

                } else {
                    self.descriptor.size += size;

                    self.descriptor.content[name] = {
                        content: hash,
                        contentType: BlobMetadata.CONTENT_TYPES.SOFT_LINK
                    };
                    deferred.resolve(hash);
                }
            };

        if (typeof size === 'function') {
            callback = size;
            size = undefined;
        }

        if (BlobConfig.hashRegex.test(hash) === false) {
            deferred.reject('Blob hash is invalid');
        } else if (size === undefined) {
            self.blobClientGetMetadata.call(self.blobClient, hash, function (err, metadata) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                addMetadata(metadata.size);
            });
        } else {
            addMetadata(size);
        }

        return deferred.promise.nodeify(callback);
    };

    /**
     * Adds multiple files.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFiles = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files);

        return Q.all(fileNames.map(function (fileName) {
            return self.addFile(fileName, files[fileName]);
        })).nodeify(callback);
    };

    /**
     * Adds multiple files as soft-links.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFilesAsSoftLinks = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files);

        return Q.all(fileNames.map(function (fileName) {
            return self.addFileAsSoftLink(fileName, files[fileName]);
        })).nodeify(callback);
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addObjectHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes);

        return Q.all(fileNames.map(function (fileName) {
            return self.addObjectHash(fileName, objectHashes[fileName]);
        })).nodeify(callback);
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addMetadataHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes);

        return Q.all(fileNames.map(function (fileName) {
            return self.addMetadataHash(fileName, objectHashes[fileName]);
        })).nodeify(callback);
    };

    /**
     * Saves this artifact and uploads the metadata to the server's storage.
     * @param callback
     */
    Artifact.prototype.save = function (callback) {
        var deferred = Q.defer();

        this.blobClient.putMetadata(this.descriptor, function (err, hash) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(hash);
            }
        });

        return deferred.promise.nodeify(callback);
    };

    return Artifact;
});
