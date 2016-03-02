/*globals requireJS*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var fs = require('fs'),
    jszip = require('jszip'),
    mime = require('mime'),

    GUID = requireJS('common/util/guid'),
    BlobMetadata = requireJS('blob/BlobMetadata'),
    BlobConfig = requireJS('blob/BlobConfig'),

    StringStreamReader = require('../../util/StringStreamReader'),
    StringStreamWriter = require('../../util/StringStreamWriter');

var BlobBackendBase = function (logger) {
    this.contentBucket = 'wg-content';
    this.metadataBucket = 'wg-metadata';
    this.tempBucket = 'wg-temp';
    this.shaMethod = BlobConfig.hashMethod;
    this.logger = logger.fork('BlobBackend');
};

// -----------------------------------------------------------------------------------------------------------------
// Must be overridden in derived classes (low-level implementation specific API calls)

BlobBackendBase.prototype.putObject = function (/*readStream, bucket, callback*/) {
    throw new Error('Not implemented yet.');
};

BlobBackendBase.prototype.getObject = function (/*hash, writeStream, bucket, callback*/) {
    throw new Error('Not implemented yet.');
};

BlobBackendBase.prototype.listObjects = function (/*bucket, callback*/) {
    throw new Error('Not implemented yet.');
};

// -----------------------------------------------------------------------------------------------------------------
// COMMON FUNCTIONALITY

// -----------------------------------------------------------------------------------------------------------------
// File handling functions

BlobBackendBase.prototype.putFile = function (name, readStream, callback) {
    // add content to storage
    // create metadata file (filename, size, object-hash, object-type, content-type)
    // add metadata to storage
    // return metadata's hash and content's hash

    // TODO: add tags and isPublic flag

    var self = this;

    if (typeof readStream === 'string') {
        // if a string is given convert it to a readable stream object
        readStream = new StringStreamReader(readStream);
    }

    self.putObject(readStream, self.contentBucket, function (err, hash, length) {
        if (err) {
            // failed to save content
            callback(err);
            return;
        }

        var metadata = new BlobMetadata({
            name: name,
            size: length,
            mime: mime.lookup(name),
            isPublic: false,
            tags: [],
            content: hash,
            contentType: BlobMetadata.CONTENT_TYPES.OBJECT
        });

        self.putMetadata(metadata, function (err, metadataHash) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, metadataHash);
        });

    });
};

BlobBackendBase.prototype.getFile = function (metadataHash, subpath, writeStream, callback) {
    if (BlobConfig.hashRegex.test(metadataHash) === false) {
        callback('Blob hash is invalid');
        return;
    }
    // TODO: get metadata
    // TODO: get all content based on metadata
    // TODO: write the stream after callback (error, metadata)
    var self = this;

    var softLinkHashes = [];

    self.getMetadata(metadataHash, function (err, metadataHash, metadata) {
        if (err) {
            callback(err);
            return;
        }

        if (metadata.contentType === BlobMetadata.CONTENT_TYPES.OBJECT) {
            self.getObject(metadata.content, writeStream, self.contentBucket, function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, metadata);
            });

        } else if (metadata.contentType === BlobMetadata.CONTENT_TYPES.SOFT_LINK) {
            if (softLinkHashes.indexOf(metadataHash) > -1) {
                // TODO: concat all soft link hashes
                callback('Circular references in softLinks: ' + metadataHash);
                return;
            }

            softLinkHashes.push(metadataHash);
            self.getFile(metadata.content, '', writeStream, callback);

        } else if (metadata.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
            // 1) create a zip package
            // 2) add all files from the descriptor to the zip
            // 3) pipe the zip package to the stream

            if (subpath) {
                if (metadata.content.hasOwnProperty(subpath)) {
                    var contentObj = metadata.content[subpath];

                    if (contentObj.contentType === BlobMetadata.CONTENT_TYPES.OBJECT) {

                        self.getObject(contentObj.content, writeStream, self.contentBucket, function (err) {
                            if (err) {
                                callback(err);
                                return;
                            }

                            callback(null, metadata);
                        });

                    } else if (contentObj.contentType === BlobMetadata.CONTENT_TYPES.SOFT_LINK) {
                        self.getFile(contentObj.content, '', writeStream, callback);
                    } else {
                        callback('subpath content type (' + contentObj.contentType +
                            ') is not supported yet in content: ' + subpath);
                    }
                } else {
                    callback('subpath does not exist in content: ' + subpath);
                }
            } else {
                // return with the full content as a zip package
                // FIXME: can we use zlib???
                // TODO: this code MUST be reimplemented!!!
                var zip = new jszip();

                var keys = Object.keys(metadata.content);
                var remaining = keys.length,
                    subPartFunction = function (subpartHash, subpartType, subpartName) {
                        // TODO: what if error?
                        var contentTemp = GUID() + '.tmp';
                        var writeStream2 = fs.createWriteStream(contentTemp);

                        var contentReadyCallback = function (/*err*/) {

                            fs.readFile(contentTemp, function (err, data) {
                                zip.file(subpartName, data);

                                remaining -= 1;

                                if (remaining === 0) {
                                    var nodeBuffer = zip.generate({type: 'nodeBuffer'});
                                    var tempFile = GUID() + '.zip';
                                    fs.writeFile(tempFile, nodeBuffer, function (err) {
                                        if (err) {
                                            callback(err);
                                            return;
                                        }

                                        var readStream = fs.createReadStream(tempFile);

                                        // FIXME: is finish/end/close the right event?
                                        writeStream.on('finish', function () {
                                            callback(null, metadata);

                                            fs.unlink(tempFile, function () {

                                            });
                                        });

                                        readStream.pipe(writeStream);
                                    });
                                }

                                fs.unlink(contentTemp, function () {

                                });
                            });
                        };

                        if (subpartType === BlobMetadata.CONTENT_TYPES.OBJECT) {
                            self.getObject(subpartHash, writeStream2, self.contentBucket, contentReadyCallback);

                        } else if (subpartType === BlobMetadata.CONTENT_TYPES.SOFT_LINK) {
                            self.getFile(subpartHash, '', writeStream2, contentReadyCallback);

                        } else {
                            // complex part within complex part is not supported
                            callback('Subpart content type is not supported: ' + subpartType + ' ' + subpartName +
                            ' ' + subpartHash);
                        }

                    };

                if (remaining === 0) {
                    // empty zip no files contained
                    // FIXME: this empty zip is not handled correctly.
                    writeStream.end(); // pmeijer -> this seems to work
                    callback(null, zip.generate({type: 'nodeBuffer'}), metadata.name);
                    return;
                }

                for (var i = 0; i < keys.length; i += 1) {
                    subPartFunction(metadata.content[keys[i]].content, metadata.content[keys[i]].contentType, keys[i]);
                }
            }
        } else {
            callback('not supported content type: ' + metadata.contentType);
        }
    });
};


// -----------------------------------------------------------------------------------------------------------------
// Metadata functions

BlobBackendBase.prototype.putMetadata = function (metadata, callback) {
    var self = this;
    var stringStream = new StringStreamReader(JSON.stringify(metadata.serialize()));

    self.putObject(stringStream, self.metadataBucket, function (err, metadataHash) {
        if (err) {
            // failed to save metadata
            callback(err);
            return;
        }

        callback(null, metadataHash);
    });
};

BlobBackendBase.prototype.getMetadata = function (metadataHash, callback) {
    var self = this,
        writeStream = new StringStreamWriter();

    self.getObject(metadataHash, writeStream, self.metadataBucket, function (err, fileInfo) {
        if (err) {
            callback(err);
            return;
        }

        // TODO: make a class for this object - how to handle dates...?
        var metadata = writeStream.toJSON();
        metadata.lastModified = fileInfo.lastModified;

        callback(null, metadataHash, metadata);
    });
};

BlobBackendBase.prototype.listAllMetadata = function (all, callback) {
    var self = this,
        allMetadata = {};

    all = all || false;

    self.listObjects(self.metadataBucket, function (err, hashes) {
        if (err) {
            callback(err);
            return;
        }

        var remaining = hashes.length,
            getMetaDataResponse = function (err, hash, metadata) {
                remaining -= 1;

                if (err) {
                    // concat error?
                    return;
                }

                if (all || metadata.isPublic) {
                    allMetadata[hash] = metadata;
                }

                if (remaining === 0) {
                    callback(null, allMetadata);
                }
            };

        if (hashes.length === 0) {
            callback(null, allMetadata);
        }

        for (var i = 0; i < hashes.length; i += 1) {
            self.getMetadata(hashes[i], getMetaDataResponse);
        }
    });
};


BlobBackendBase.prototype.test = function (/*callback*/) {
    // TODO: write a randomly generated small binary file
    // TODO: read it back by hash
    // TODO: check if it is exactly the same
    throw new Error('Not implemented yet.');
};

module.exports = BlobBackendBase;