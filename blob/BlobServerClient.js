/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 *
 * Server side BLOB client implementation.
 */

define(['blob/BlobClient',
        'blob/BlobManagerFS'],
    function (BlobClient, BlobManagerFS) {

        /**
         * Initializes a new instance of a server side file system object.
         *
         * Note: This code strictly runs in node.js (server side).
         *
         * @param {{}} parameters
         * @constructor
         */
        function BlobServerClient() {
            BlobClient.call(this);
            throw new Error('not implemented yet');
        }

        // Inherits from BlobClient
        BlobServerClient.prototype = Object.create(BlobClient.prototype);

        // Override the constructor with this object's constructor
        BlobServerClient.prototype.constructor = BlobServerClient;

        BlobServerClient.prototype.getInfo = function (hash, callback) {
            throw new Error('not implemented yet');
        };

        BlobServerClient.prototype.getObject = function (hash, callback) {
            throw new Error('not implemented yet');
        };


        BlobServerClient.prototype.addComplexObject = function (name, complexObjectDescriptor, callback) {
            var sortedDescriptor = {};

            var fnames = Object.keys(complexObjectDescriptor);
            fnames.sort();
            for (var j = 0; j < fnames.length; j += 1) {
                sortedDescriptor[fnames[j]] = complexObjectDescriptor[fnames[j]];
            }

            throw new Error('not implemented yet');
        };


        BlobServerClient.prototype.addObject = function (name, data, callback) {
            throw new Error('not implemented yet');
        };

        return BlobServerClient;
    });
