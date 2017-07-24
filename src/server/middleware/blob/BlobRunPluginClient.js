/*globals requireJS*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 *
 * Should be used only by developers in developer mode. Application server shall not run at the same time.
 */

'use strict';

var BlobClientClass = requireJS('blob/BlobClient'),
    BlobMetadata = requireJS('blob/BlobMetadata'),
    Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    BufferStreamReader = require('../../util/BufferStreamReader'),
    StringStreamWriter = require('../../util/StringStreamWriter'),
    ensureDir = require('../../util/ensureDir');

/**
 * Initializes a new instance of a server side file system object.
 *
 * Note: This code strictly runs in node.js (server side).
 *
 * @param {{}} parameters
 * @constructor
 */
function BlobRunPluginClient(blobBackend, logger, opts) {
    BlobClientClass.call(this, {logger: logger});
    this.opts = opts;
    this.blobBackend = blobBackend;
    this.writeBlobFilesDir = opts && opts.writeBlobFilesDir;
    if (this.writeBlobFilesDir) {
        this.logger.warn('writeBlobFilesDir given, will also write blobs to',
            path.join(process.cwd(), this.writeBlobFilesDir));
    }
}

// Inherits from BlobClient
BlobRunPluginClient.prototype = Object.create(BlobClientClass.prototype);

// Override the constructor with this object's constructor
BlobRunPluginClient.prototype.constructor = BlobRunPluginClient;

BlobRunPluginClient.prototype.getNewInstance = function () {
    return new BlobRunPluginClient(this.blobBackend, this.logger, this.opts);
};

BlobRunPluginClient.prototype.getMetadata = function (metadataHash, callback) {
    var self = this,
        deferred = Q.defer();

    self.blobBackend.getMetadata(metadataHash, function (err, hash, metadata) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(metadata);
        }
    });

    return deferred.promise.nodeify(callback);
};

BlobRunPluginClient.prototype.getObject = function (metadataHash, callback, subpath) {
    var self = this,
        writeStream = new StringStreamWriter(),
        deferred = Q.defer();

    // TODO: we need to get the content and save as a local file.
    // if we just proxy the stream we cannot set errors correctly.

    self.blobBackend.getFile(metadataHash, subpath || '', writeStream, function (err /*, hash*/) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(writeStream.getBuffer());
        }
    });

    return deferred.promise.nodeify(callback);
};


BlobRunPluginClient.prototype.putMetadata = function (metadataDescriptor, callback) {
    var self = this,
        metadata = new BlobMetadata(metadataDescriptor),
        deferred = Q.defer();

    self.blobBackend.putMetadata(metadata, function (err, hash) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(hash);
        }
    });

    return deferred.promise.nodeify(callback);
};


BlobRunPluginClient.prototype.putFile = function (name, data, callback) {
    var deferred = Q.defer(),
        self = this,
        filePath;

    if (Buffer.isBuffer(data)) {
        data = new BufferStreamReader(data);
    }

    this.blobBackend.putFile(name, data, function (err, hash) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(hash);
        }
    });

    if (this.writeBlobFilesDir) {
        filePath = path.join(process.cwd(), this.writeBlobFilesDir, name);

        return ensureDir(path.dirname(filePath))
            .then(function () {
                return Q.all([
                    deferred.promise,
                    Q.ninvoke(fs, 'writeFile', filePath, data)
                ]);
            })
            .then(function (res) {
                self.logger.info('Wrote file to', filePath);
                return res[0]; // The hash
            })
            .nodeify(callback);
    } else {
        return deferred.promise.nodeify(callback);
    }
};

module.exports = BlobRunPluginClient;
