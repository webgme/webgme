/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define(['plugin/PluginFSBase'],
    function (PluginFSBase) {

        /**
         * Initializes a new instance of a client side file system object.
         *
         * Note: This code strictly runs inside the browser.
         *
         * @param {{}} parameters
         * @constructor
         */
        function PluginFSClient(parameters) {
            PluginFSBase.call(this, parameters);
            this._artifactDescriptor = {};
        }

        // Inherits from PluginFSBase
        PluginFSClient.extends(PluginFSBase);

        // Override the constructor with this object's constructor
        PluginFSClient.prototype.constructor = PluginFSClient;

        /**
         * Creates a new artifact with the given name.
         *
         * @param {string} name - filename of the artifact without extension
         */
        PluginFSClient.prototype.createArtifact = function (name) {
            if (this._artifactName === null) {
                this._artifactName = name;
                this._artifactDescriptor = {};
                return true;
            } else {
                return false;
            }
        };

        /**
         * Saves all files and the directory structure as a zip package and downloads it to the client.
         *
         * @returns {boolean} true if successful otherwise false.
         */
        PluginFSClient.prototype.saveArtifact = function (callback) {
            var self = this;
            var sortedDescriptor = {};

            var fnames = Object.keys(this._artifactDescriptor);
            fnames.sort();
            for (var j = 0; j < fnames.length; j += 1) {
                sortedDescriptor[fnames[j]] = this._artifactDescriptor[fnames[j]];
            }


            var oReq = new XMLHttpRequest();
            oReq.open("PUT", '/blob/create/' + this._artifactName + '.json?complex=true', true);
            oReq.onload = function (oEvent) {
                // Uploaded.
                var response = JSON.parse(oEvent.target.response);
                // TODO: handle error
                var hash = Object.keys(response)[0];
                callback(null, hash);
                self._artifactName = null;
                self._artifactDescriptor = null;
            };

            // FIXME: in production mode do not indent the json file.
            var blob = new Blob([JSON.stringify(sortedDescriptor, null, 4)], {type: 'text/plain'});

            oReq.send(blob);
        };

        /**
         * Adds a new file and creates directory structure if it does not exist. If file already exists then overrides it.
         *
         * @param {string} path - path to the file 'mydir1/subdir2/file.txt' or 'file.txt'
         * @param {string} data - file content as a string
         * @returns {boolean} true if successful otherwise false.
         */
        PluginFSClient.prototype.addFile = function (path, data, callback) {
            var self = this;

            if (this._artifactName !== null) {
                var oReq = new XMLHttpRequest();
                oReq.open("PUT", '/blob/create/' + path.substring(path.lastIndexOf('/') + 1), true);
                oReq.onload = function (oEvent) {
                    // Uploaded.
                    var response = JSON.parse(oEvent.target.response);
                    // TODO: handle error
                    var hash = Object.keys(response)[0];
                    self._artifactDescriptor[path] = hash;
                    callback(null, hash);
                };

                // FIXME: in production mode do not indent the json file.
                var blob = new Blob([data], {type: 'text/plain'});

                oReq.send(blob);

                return true;
            } else {
                callback('Must call createArtifact first.');
                return false;
            }
        };

        return PluginFSClient;
    });
