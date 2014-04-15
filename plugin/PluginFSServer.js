/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define(['plugin/PluginFSBase',
        'blob/BlobManagerFS',
        'path'],
    function (PluginFSBase, BlobManagerFS, PATH) {

        /**
         * Initializes a new instance of a server side file system object.
         *
         * Note: This code strictly runs in node.js (server side).
         *
         * @param {{}} parameters
         * @constructor
         */
        function PluginFSServer(parameters) {
            PluginFSBase.call(this, parameters);
            this._artifactDescriptor = {};
            this._blobStorage = new BlobManagerFS();
        }

        // Inherits from PluginFSBase
        PluginFSServer.extends(PluginFSBase);

        // Override the constructor with this object's constructor
        PluginFSServer.prototype.constructor = PluginFSServer;

        PluginFSServer.prototype.initialize = function (callback) {
            this._blobStorage.initialize(callback);
        };

        /**
         * Creates a new artifact with the given name.
         *
         * @param {string} name - filename of the artifact without extension
         */
        PluginFSServer.prototype.createArtifact = function (name) {
            if (this._artifactName === null) {
                this._artifactName = name;
                this._artifactDescriptor = {};
                return true;
            } else {
                return false;
            }
        };

        /**
         * Saves all files and the directory structure as a zip package on the server side filesystem to the given
         * parameters.outputpath location.
         *
         * @returns {boolean} true if successful otherwise false.
         */
        PluginFSServer.prototype.saveArtifact = function (callback) {
            var self = this;
            var sortedDescriptor = {};

            var fnames = Object.keys(this._artifactDescriptor);
            fnames.sort();
            for (var j = 0; j < fnames.length; j += 1) {
                sortedDescriptor[fnames[j]] = this._artifactDescriptor[fnames[j]];
            }

            // FIXME: in production mode do not indent the json file.
            this._blobStorage.save({name: this._artifactName + '.zip', complex: true}, JSON.stringify(sortedDescriptor, null, 4), function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(err, hash);
                self._artifactName = null;
                self._artifactDescriptor = null;
            });
        };

        /**
         * Adds a new file and creates directory structure if it does not exist. If file already exists then overrides it.
         *
         * @param {string} path - path to the file 'mydir1/subdir2/file.txt' or 'file.txt'
         * @param {string} data - file content as a string
         * @returns {boolean} true if successful otherwise false.
         */
        PluginFSServer.prototype.addFile = function (path, data, callback) {
            var self = this;

            if (this._artifactName !== null) {

                this._blobStorage.save({name: PATH.basename(path)}, data, function (err, hash) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    self._artifactDescriptor[path] = hash;
                    callback(null, hash);
                });


                return true;
            } else {
                callback('Must call createArtifact first.');
                return false;
            }
        };

        return PluginFSServer;
    });
