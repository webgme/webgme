/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var PluginNodeManagerBase = require('./nodemanagerbase'),

    BlobFSBackend = require('../server/middleware/blob/BlobFSBackend'),
    BlobRunPluginClient = require('../server/middleware/blob/BlobRunPluginClient');

/**
 * Creates a new instance of PluginCliManager
 * @param {UserProject} [project] - optional default project, can be passed during initialization of plugin too.
 * @param {object} - mainLogger - logger for manager, plugin-logger will fork from this logger.
 * @param {object} gmeConfig - global configuration
 * @constructor
 */
function PluginCliManager(project, mainLogger, gmeConfig) {
    var blobBackend = new BlobFSBackend(gmeConfig),
        blobClient = new BlobRunPluginClient(blobBackend);

    PluginNodeManagerBase.call(this, blobClient, project, mainLogger, gmeConfig);
}

// Inherit from PluginNodeManagerBase
PluginCliManager.prototype = Object.create(PluginNodeManagerBase.prototype);
PluginCliManager.prototype.constructor = PluginCliManager;

module.exports = PluginCliManager;