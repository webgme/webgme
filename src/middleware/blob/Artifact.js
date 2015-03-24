/*globals define*/
/*jshint browser: true, node:true*/

/*
 * @author lattmann / https://github.com/lattmann
 */

define(['blob/BlobMetadata', 'blob/BlobConfig', 'common/core/tasync'], function (BlobMetadata, BlobConfig, tasync) {
    'use strict';
    /**
     * Creates a new instance of artifact, i.e. complex object, in memory. This object can be saved in the storage.
     * @param {string} name Artifact's name without extension
     * @param {blob.BlobClient} blobClient
     * @param {blob.BlobMetadata} descriptor
     * @constructor
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
     * @param callback
     */
    Artifact.prototype.addFile = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClientPutFile.call(self.blobClient, filename, content, function (err, hash) {
            if (err) {
                callback(err);
                return;
            }

            self.addObjectHash(name, hash, function (err, hash) {
                callback(err, hash);
            });
        });
    };

    Artifact.prototype.addFileAsSoftLink = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClientPutFile.call(self.blobClient, filename, content,
            function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                self.addMetadataHash(name, hash, function (err, hash) {
                    callback(err, hash);
                });
            });
    };

    /**
     * Adds a hash to the artifact using the given file path.
     * @param {string} name Path to the file in the artifact. Note: 'a/b/c.txt'
     * @param {string} hash Metadata hash that has to be added.
     * @param callback
     */
    Artifact.prototype.addObjectHash = function (name, hash, callback) {
        var self = this;

        if (BlobConfig.hashRegex.test(hash) === false) {
            callback('Blob hash is invalid');
            return;
        }

        self.blobClientGetMetadata.call(self.blobClient, hash, function (err, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (self.descriptor.content.hasOwnProperty(name)) {
                callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

            } else {
                self.descriptor.size += metadata.size;

                self.descriptor.content[name] = {
                    content: metadata.content,
                    contentType: BlobMetadata.CONTENT_TYPES.OBJECT
                };
                callback(null, hash);
            }
        });
    };

    Artifact.prototype.addMetadataHash = function (name, hash, callback) {
        var self = this;

        if (BlobConfig.hashRegex.test(hash) === false) {
            callback('Blob hash is invalid');
            return;
        }
        self.blobClientGetMetadata.call(self.blobClient, hash, function (err, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (self.descriptor.content.hasOwnProperty(name)) {
                callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

            } else {
                self.descriptor.size += metadata.size;

                self.descriptor.content[name] = {
                    content: hash,
                    contentType: BlobMetadata.CONTENT_TYPES.SOFT_LINK
                };
                callback(null, hash);
            }
        });
    };

    /**
     * Adds multiple files.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFiles = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding files: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addFile(fileNames[i], files[fileNames[i]], counterCallback);
        }
    };

    /**
     * Adds multiple files as soft-links.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFilesAsSoftLinks = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding files as soft-links: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addFileAsSoftLink(fileNames[i], files[fileNames[i]], counterCallback);
        }
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addObjectHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding objectHashes: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addObjectHash(fileNames[i], objectHashes[fileNames[i]], counterCallback);
        }
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addMetadataHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding objectHashes: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addMetadataHash(fileNames[i], objectHashes[fileNames[i]], counterCallback);
        }
    };

    /**
     * Saves this artifact and uploads the metadata to the server's storage.
     * @param callback
     */
    Artifact.prototype.save = function (callback) {
        this.blobClient.putMetadata(this.descriptor, callback);
    };

    return Artifact;
});
