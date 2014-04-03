/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define(["jszip",
    'plugin/PluginFSBase',
    'fs',
    'path'],
    function (ZIP, PluginFSBase, FS, Path) {

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
        }

        // Inherits from PluginFSBase
        PluginFSServer.extends(PluginFSBase);

        // Override the constructor with this object's constructor
        PluginFSServer.prototype.constructor = PluginFSServer;

        /**
         * Creates a new artifact with the given name.
         *
         * @param {string} name - filename of the artifact without extension
         */
        PluginFSServer.prototype.createArtifact = function (name) {
            if (this._artifactName === null) {
                this._artifactName = name;
                this._artifactZip = ZIP();
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
        PluginFSServer.prototype.saveArtifact = function () {
            // FIXME: Windows cannot extract compressed zip packages with 'DEFLATE' flag, 7-zip can
            //var data = this._artifactZip.generate({base64:false,compression:'DEFLATE'});
            var data = this._artifactZip.generate({base64: false});
            try {
                FS.writeFileSync(Path.join(this._parameters.outputpath, this._artifactName + ".zip"), data, 'binary');
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
        PluginFSServer.prototype.addFile = function (path, data) {
            if (this._artifactName !== null) {
                this._artifactZip.file(path, data);
                return true;
            } else {
                return false;
            }
        };

        return PluginFSServer;
    });
