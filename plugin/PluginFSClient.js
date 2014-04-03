/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define(["jszip",
    'plugin/PluginFSBase',
    'lib/filesaver/FileSaver'],
    function (ZIP, PluginFSBase, FileSaver) {

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
                this._artifactZip = new ZIP();
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
        PluginFSClient.prototype.saveArtifact = function () {
            // NOTE: DEFLATE compression does not work for me.
            var data = this._artifactZip.generate({base64: false, type: "blob"});
            try {
                window.saveAs(data, this._artifactName + ".zip");

                this._artifactName = null;
                this._artifactZip = null;
                return true;
            } catch (e) {
                this._artifactName = null;
                this._artifactZip = null;
                return false;
            }
        };

        /**
         * Adds a new file and creates directory structure if it does not exist. If file already exists then overrides it.
         *
         * @param {string} path - path to the file 'mydir1/subdir2/file.txt' or 'file.txt'
         * @param {string} data - file content as a string
         * @returns {boolean} true if successful otherwise false.
         */
        PluginFSClient.prototype.addFile = function (path, data) {
            if (this._artifactName !== null) {
                this._artifactZip.file(path, data);
                return true;
            } else {
                return false;
            }
        };

        return PluginFSClient;
    });
