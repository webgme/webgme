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
    BufferStreamReader = require('../../util/BufferStreamReader'),
    StringStreamWriter = require('../../util/StringStreamWriter');

/**
 * Initializes a new instance of a server side file system object.
 *
 * Note: This code strictly runs in node.js (server side).
 *
 * @param {{}} parameters
 * @constructor
 */
function BlobRunPluginClient(blobBackend, logger) {
    BlobClientClass.call(this, {logger: logger});
    this.blobBackend = blobBackend;
}

// Inherits from BlobClient
BlobRunPluginClient.prototype = Object.create(BlobClientClass.prototype);

// Override the constructor with this object's constructor
BlobRunPluginClient.prototype.constructor = BlobRunPluginClient;

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
    var deferred = Q.defer();

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

    return deferred.promise.nodeify(callback);
};

module.exports = BlobRunPluginClient;
