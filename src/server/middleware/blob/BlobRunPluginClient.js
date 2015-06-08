/*globals requireJS*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 *
 * Should be used only by developers in developer mode. Application server shall not run at the same time.
 */

'use strict';

var BlobClient = requireJS('blob/BlobClient'),
    BlobMetadata = requireJS('blob/BlobMetadata'),

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
function BlobRunPluginClient(blobBackend) {
    BlobClient.call(this);
    this.blobBackend = blobBackend;
}

// Inherits from BlobClient
BlobRunPluginClient.prototype = Object.create(BlobClient.prototype);

// Override the constructor with this object's constructor
BlobRunPluginClient.prototype.constructor = BlobRunPluginClient;

BlobRunPluginClient.prototype.getMetadata = function (metadataHash, callback) {
    var self = this;

    self.blobBackend.getMetadata(metadataHash, function (err, hash, metadata) {
        callback(err, metadata);
    });

};

BlobRunPluginClient.prototype.getObject = function (metadataHash, callback) {
    var self = this;
    var writeStream = new StringStreamWriter();

    // TODO: we need to get the content and save as a local file.
    // if we just proxy the stream we cannot set errors correctly.

    self.blobBackend.getFile(metadataHash, '', writeStream, function (err /*, hash*/) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, writeStream.getBuffer());
    });
};


BlobRunPluginClient.prototype.putMetadata = function (metadataDescriptor, callback) {
    var self = this;
    var metadata = new BlobMetadata(metadataDescriptor);

    self.blobBackend.putMetadata(metadata, function (err, hash) {
        callback(err, hash);
    });
};


BlobRunPluginClient.prototype.putFile = function (name, data, callback) {

    if (Buffer.isBuffer(data)) {
        data = new BufferStreamReader(data);
    }

    this.blobBackend.putFile(name, data, function (err, hash) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, hash);
    });
};

module.exports = BlobRunPluginClient;
