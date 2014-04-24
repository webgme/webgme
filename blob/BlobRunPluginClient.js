/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 *
 * Should be used only by developers in developer mode. Application server shall not run at the same time.
 */

define(['blob/BlobClient'],
    function (BlobClient) {

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

        BlobRunPluginClient.prototype.getInfo = function (metadataHash, callback) {
            var self = this;

            self.blobBackend.getMetadata(metadataHash, function (err, hash, metadata) {
                callback(err, metadata);
            });

        };

        BlobRunPluginClient.prototype.getObject = function (hash, callback) {
            throw new Error('Not implemented yet.');
        };


        BlobRunPluginClient.prototype.addComplexObject = function (complexObjectDescriptor, callback) {
            var self = this;
            var fnames = Object.keys(complexObjectDescriptor.content);
            fnames.sort();

            var metadata = {
                name: complexObjectDescriptor.name,
                size: complexObjectDescriptor.size,
                mime: complexObjectDescriptor.mime,
                content: {},
                contentType: complexObjectDescriptor.contentType
            };

            if (complexObjectDescriptor.contentType === 'complex') {
                for (var j = 0; j < fnames.length; j += 1) {
                    metadata.content[fnames[j]] = complexObjectDescriptor.content[fnames[j]];
                }
            } else {
                callback('not supported metadata type');
                return;
            }

            self.blobBackend.putMetadata(metadata, function (err, hash) {
                callback(err, hash);
            });
        };


        BlobRunPluginClient.prototype.addObject = function (name, data, callback) {

            this.blobBackend.putFile(name, data, function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, hash);
            });
        };

        return BlobRunPluginClient;
    });
