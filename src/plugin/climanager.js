/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var PluginNodeManagerBase = require('./nodemanagerbase'),

    BlobFSBackend = require('../server/middleware/blob/BlobFSBackend'),
    BlobRunPluginClient = require('../server/middleware/blob/BlobRunPluginClient');

function PluginCliManager(project, mainLogger, gmeConfig) {
    var blobBackend = new BlobFSBackend(gmeConfig),
        blobClient = new BlobRunPluginClient(blobBackend);

    PluginNodeManagerBase.call(this, blobClient, project, mainLogger, gmeConfig);
}

// Inherit from PluginNodeManagerBase
PluginCliManager.prototype = Object.create(PluginNodeManagerBase.prototype);
PluginCliManager.prototype.constructor = PluginCliManager;

module.exports = PluginCliManager;