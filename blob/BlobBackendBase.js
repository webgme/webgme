/**
 * Created by zsolt on 4/19/14.
 */

define(['blob/BlobMetadata',
    'fs',
    'jszip',
    'mime',
    'util/guid',
    'util/StringStreamReader',
    'util/StringStreamWriter'], function (BlobMetadata, fs, jszip, mime, GUID, StringStreamReader, StringStreamWriter) {

    var BlobBackendBase = function () {
        this.contentBucket = 'wg-content';
        this.metadataBucket = 'wg-metadata';
        this.tempBucket = 'wg-temp';
        this.shaMethod = 'sha1'; // TODO: in the future we may switch to sha512
    };

    // -----------------------------------------------------------------------------------------------------------------
    // Must be overridden in derived classes (low-level implementation specific API calls)

    BlobBackendBase.prototype.putObject = function (readStream, bucket, callback) {
        throw new Error('Not implemented yet.');
    };

    BlobBackendBase.prototype.getObject = function (hash, writeStream, bucket, callback) {
        throw new Error('Not implemented yet.');
    };

    BlobBackendBase.prototype.listObjects = function (bucket, callback) {
        throw new Error('Not implemented yet.');
    };

    // -----------------------------------------------------------------------------------------------------------------
    // COMMON FUNCTIONALITY

    // -----------------------------------------------------------------------------------------------------------------
    // File handling functions

    BlobBackendBase.prototype.putFile = function (name, readStream, callback) {
        // TODO: add content to storage
        // TODO: create metadata file (filename, size, object-hash, object-type, content-type)
        // TODO: add metadata to storage
        // TODO: return metadata's hash and content's hash

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
        // TODO: get metadata
        // TODO: get all content based on metadata
        // TODO: write the stream after callback (error, metadata)
        var self = this;
        var stringStream = new StringStreamWriter();

        self.getMetadata(metadataHash, function (err, metadataHash, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (metadata.contentType === 'object') {
                self.getObject(metadata.content, writeStream, self.contentBucket, function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, metadata);
                });

            } else if (metadata.contentType === 'complex') {
                // 1) create a zip package
                // 2) add all files from the descriptor to the zip
                // 3) pipe the zip package to the stream

                // FIXME: can we use zlib???
                // TODO: this code MUST be reimplemented!!!
                var zip = new jszip();

                var keys = Object.keys(metadata.content);
                var remaining = keys.length;

                if (remaining === 0) {
                    // empty zip no files contained
                    // FIXME: this empty zip is not handled correctly.
                    callback(null, zip.generate({type:'nodeBuffer'}), metadata.name);
                    return;
                }

                for (var i = 0; i < keys.length; i += 1) {
                    (function(subpartHash, subpartName){
                        // TODO: what if error?
                        var contentTemp = GUID() + '.tmp';
                        var writeStream2 = fs.createWriteStream(contentTemp);

                        self.getObject(subpartHash, writeStream2, self.contentBucket, function (err) {


                            fs.readFile(contentTemp, function (err, data) {
                                zip.file(subpartName, data);

                                remaining -= 1;

                                if (remaining === 0) {
                                    var nodeBuffer = zip.generate({type:'nodeBuffer'});
                                    var tempFile = GUID() + '.zip';
                                    fs.writeFile(tempFile, nodeBuffer, function (err) {
                                        if (err) {
                                            callback(err);
                                            return;
                                        }

                                        var readStream = fs.createReadStream(tempFile);

                                        writeStream.on('finish', function() {
                                            callback(null, metadata);

                                            fs.unlink(tempFile, function (){

                                            });
                                        });

                                        readStream.pipe(writeStream);
                                    });
                                }

                                fs.unlink(contentTemp, function (){

                                });
                            });
                        });
                    })(metadata.content[keys[i]].content, keys[i])
                }
            } else {
                // TODO: handle here the complex type and soft links
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

    BlobBackendBase.prototype.listAllMetadata = function (callback) {
        var self = this,
            allMetadata = {};

        self.listObjects(self.metadataBucket, function (err, hashes) {
            if (err) {
                callback(err);
                return;
            }

            var remaining = hashes.length;

            if (hashes.length === 0) {
                callback(null, allMetadata);
            }

            for (var i = 0; i < hashes.length; i += 1) {
                self.getMetadata(hashes[i], function (err, hash, metadata) {
                    remaining -= 1;

                    if (err) {
                        // concat error?
                        return;
                    }

                    allMetadata[hash] = metadata;

                    if (remaining === 0) {
                        callback(null, allMetadata);
                    }
                });
            }
        });
    };



    BlobBackendBase.prototype.test = function (callback) {
        // TODO: write a randomly generated small binary file
        // TODO: read it back by hash
        // TODO: check if it is exactly the same
        throw new Error('Not implemented yet.');
    };

    return BlobBackendBase;
});