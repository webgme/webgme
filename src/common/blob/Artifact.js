/*globals define*/
/*jshint browser: true, node:true*/

/**
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
     * Creates a new instance of artifact, i.e. complex object, in memory. This object can be saved in the blob-storage
     * on the server and later retrieved with its metadata hash.
     * @param {string} name Artifact's name without extension
     * @param {BlobClient} blobClient
     * @param {BlobMetadata} descriptor
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
     * @param {string} name - filename
     * @param {Blob} content - File object or Blob.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string} <b>metadataHash</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    Artifact.prototype.addFile = function (name, content, callback) {
        var self = this,
            filename = name.substring(name.lastIndexOf('/') + 1),
            deferred = Q.defer();

        self.blobClientPutFile.call(self.blobClient, filename, content, function (err, metadataHash) {
            if (err) {
                deferred.reject(err);
                return;
            }

            self.addObjectHash(name, metadataHash, function (err, metadataHash) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                deferred.resolve(metadataHash);
            });
        });

        return deferred.promise.nodeify(callback);
    };

    /**
     * Adds files as soft-link.
     * @param {string} name - filename.
     * @param {Blob} content - File object or Blob.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string} <b>metadataHash</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    Artifact.prototype.addFileAsSoftLink = function (name, content, callback) {
        var deferred = Q.defer(),
            self = this,
            filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClientPutFile.call(self.blobClient, filename, content,
            function (err, metadataHash) {
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

                self.addMetadataHash(name, metadataHash, size)
                    .then(deferred.resolve)
                    .catch(deferred.reject);
            });

        return deferred.promise.nodeify(callback);
    };

    /**
     * Adds a hash to the artifact using the given file path.
     * @param {string} name - Path to the file in the artifact. Note: 'a/b/c.txt'
     * @param {string} metadataHash - Metadata hash that has to be added.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string} <b>hash</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    Artifact.prototype.addObjectHash = function (name, metadataHash, callback) {
        var self = this,
            deferred = Q.defer();

        if (BlobConfig.hashRegex.test(metadataHash) === false) {
            deferred.reject('Blob hash is invalid');
        } else {
            self.blobClientGetMetadata.call(self.blobClient, metadataHash, function (err, metadata) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                if (self.descriptor.content.hasOwnProperty(name)) {
                    deferred.reject(new Error('Another content with the same name was already added. ' +
                        JSON.stringify(self.descriptor.content[name])));

                } else {
                    self.descriptor.size += metadata.size;

                    self.descriptor.content[name] = {
                        content: metadata.content,
                        contentType: BlobMetadata.CONTENT_TYPES.OBJECT
                    };
                    deferred.resolve(metadataHash);
                }
            });
        }

        return deferred.promise.nodeify(callback);
    };

    /**
     * Adds a hash to the artifact using the given file path.
     * @param {string} name - Path to the file in the artifact. Note: 'a/b/c.txt'
     * @param {string} metadataHash - Metadata hash that has to be added.
     * @param {number} [size] - Size of the referenced blob.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string} <b>hash</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    Artifact.prototype.addMetadataHash = function (name, metadataHash, size, callback) {
        var self = this,
            deferred = Q.defer(),
            addMetadata = function (size) {
                if (self.descriptor.content.hasOwnProperty(name)) {
                    deferred.reject(new Error('Another content with the same name was already added. ' +
                        JSON.stringify(self.descriptor.content[name])));

                } else {
                    self.descriptor.size += size;

                    self.descriptor.content[name] = {
                        content: metadataHash,
                        contentType: BlobMetadata.CONTENT_TYPES.SOFT_LINK
                    };
                    deferred.resolve(metadataHash);
                }
            };

        if (typeof size === 'function') {
            callback = size;
            size = undefined;
        }

        if (BlobConfig.hashRegex.test(metadataHash) === false) {
            deferred.reject(new Error('Blob hash is invalid'));
        } else if (size === undefined) {
            self.blobClientGetMetadata.call(self.blobClient, metadataHash, function (err, metadata) {
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
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string[]} <b>metadataHashes</b>.<br>
     * On error the promise will be rejected with {@link Error|string} <b>error</b>.
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
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string[]} <b>metadataHashes</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
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
     * @param {object.<string, string>} metadataHashes - Keys are file paths and values metadata hashes.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string[]} <b>hashes</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    Artifact.prototype.addObjectHashes = function (metadataHashes, callback) {
        var self = this,
            fileNames = Object.keys(metadataHashes);

        return Q.all(fileNames.map(function (fileName) {
            return self.addObjectHash(fileName, metadataHashes[fileName]);
        })).nodeify(callback);
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} metadataHashes - Keys are file paths and values metadata hashes.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string[]} <b>hashes</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    Artifact.prototype.addMetadataHashes = function (metadataHashes, callback) {
        var self = this,
            fileNames = Object.keys(metadataHashes);

        return Q.all(fileNames.map(function (fileName) {
            return self.addMetadataHash(fileName, metadataHashes[fileName]);
        })).nodeify(callback);
    };

    /**
     * Saves this artifact and uploads the metadata to the server's storage.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {string} <b>metadataHash</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
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
