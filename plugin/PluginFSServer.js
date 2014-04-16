/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
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
        function PluginFSServer() {
            BlobClient.call(this);
            this.blobStorage = new BlobManagerFS();
        }

        // Inherits from BlobClient
        PluginFSServer.prototype = Object.create(BlobClient.prototype);

        // Override the constructor with this object's constructor
        PluginFSServer.prototype.constructor = PluginFSServer;

        PluginFSServer.prototype.initialize = function (callback) {
            this.blobStorage.initialize(callback);
        };


        PluginFSServer.prototype.getInfo = function (hash, callback) {
            callback(null, this.blobStorage.getInfo(hash));
        };

        PluginFSServer.prototype.getObject = function (hash, callback) {
            this.blobStorage.load(hash, callback);
        };


        PluginFSServer.prototype.addComplexObject = function (name, complexObjectDescriptor, callback) {
            var sortedDescriptor = {};

            var fnames = Object.keys(complexObjectDescriptor);
            fnames.sort();
            for (var j = 0; j < fnames.length; j += 1) {
                sortedDescriptor[fnames[j]] = complexObjectDescriptor[fnames[j]];
            }

            this.blobStorage.save({name: name + '.json', complex: true}, JSON.stringify(sortedDescriptor, null, 4), function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(err, hash);
            });
        };


        PluginFSServer.prototype.addObject = function (name, data, callback) {
            this.blobStorage.save({name: name}, data, function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, hash);
            });
        };

        return PluginFSServer;
    });
