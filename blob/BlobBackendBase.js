/**
 * Created by zsolt on 4/19/14.
 */

define(['fs',
    'util/guid',
    'util/StringStreamReader',
    'util/StringStreamWriter'], function (fs, GUID, StringStreamReader, StringStreamWriter) {

    var BlobBackendBase = function () {
        this.contentBucket = 'wg-content';
        this.metadataBucket = 'wg-metadata';
        this.tempBucket = 'wg-temp';
        this.shaMethod = 'sha1';
    };

    // -----------------------------------------------------------------------------------------------------------------
    // Must be overriden in derived classes (low-level implementation specific API calls)

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
    // common functionality
    BlobBackendBase.prototype.addFile = function (name, readStream, callback) {
        // TODO: add content to storage
        // TODO: create metadata file (filename, size, object-hash, object-type, content-type)
        // TODO: add metadata to storage
        // TODO: return metadata's hash and content's hash

        var self = this;

        self.putObject(readStream, self.contentBucket, function (err, hash, length) {
            if (err) {
                // failed to save content
                callback(err);
                return;
            }

            // TODO: make a class for this object
            var metadata = {
                name: name,
                size: length,
                mime: 'application/xml',
                content: hash,
                contentType: 'object'
            };

            var stringStream = new StringStreamReader(JSON.stringify(metadata));

            self.putObject(stringStream, self.metadataBucket, function (err, metadataHash) {
                if (err) {
                    // failed to save metadata
                    callback(err);
                    return;
                }

                callback(null, metadataHash);
            });
        });
    };

    BlobBackendBase.prototype.getFile = function (metadataHash, writeStream, callback) {
        // TODO: get metadata
        // TODO: get all content based on metadata
        // TODO: write the stream after callback (error, metadata)
        var self = this;
        var stringStream = new StringStreamWriter();

        self.getObject(metadataHash, stringStream, self.metadataBucket, function (err) {
            if (err) {
                callback(err);
                return;
            }

            var metadata = stringStream.toJSON();
            if (metadata.contentType === 'object') {
                self.getObject(metadata.content, writeStream, self.contentBucket, function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, metadata);
                });
            } else {
                // TODO: handle here the complex type and soft links
                callback('not supported content type');
            }
        });
    };

    BlobBackendBase.prototype.getMetadata = function (metadataHash, callback) {
        throw new Error('Not implemented yet.');
    };

    BlobBackendBase.prototype.listAllMetadata = function (callback) {
        throw new Error('Not implemented yet.');
    };


    BlobBackendBase.prototype.test = function (callback) {
        // TODO: write a randomly generated small binary file
        // TODO: read it back by hash
        // TODO: check if it is exactly the same
        throw new Error('Not implemented yet.');
    };

    return BlobBackendBase;
});