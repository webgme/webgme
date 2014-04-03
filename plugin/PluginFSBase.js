/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([], function () {

    // shortcut for inheritance
    if (Function.prototype.extends === undefined) {
        Function.prototype.extends = function (parent) {
            this.prototype = Object.create(parent.prototype);
        };
    }

    /**
     * Initializes a new instance of plugin file system base.
     *
     * @param parameters
     * @constructor
     */
    function PluginFSBase(parameters) {
        this._parameters = parameters;
        this._artifactName = null;
    }

    /**
     * Creates a new artifact with the given name.
     *
     * @param {string} name - filename of the artifact without extension
     */
    PluginFSBase.prototype.createArtifact = function (name) {
        throw new Error('not implemented');
    };

    /**
     * Saves all files and the directory structure.
     */
    PluginFSBase.prototype.saveArtifact = function () {
        throw new Error('not implemented');
    };

    /**
     * Adds a new file and creates directory structure if it does not exist. If file already exists then overrides it.
     *
     * @param {string} path - path to the file 'mydir1/subdir2/file.txt' or 'file.txt'
     * @param {string} data - file content as a string
     */
    PluginFSBase.prototype.addFile = function (path, data) {
        throw new Error('not implemented');
    };

    // TODO: figure out how to append to a file

    return PluginFSBase;
});
