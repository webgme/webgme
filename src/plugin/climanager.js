/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var PluginManagerBase = requireJS('plugin/managerbase'),
    BlobClientWithFSBackend = require('../server/middleware/blob/BlobClientWithFSBackend');

/**
 * Creates a new instance of PluginCliManager
 * @param {UserProject} [project] - optional default project, can be passed during initialization of plugin too.
 * @param {object} - mainLogger - logger for manager, plugin-logger will fork from this logger.
 * @param {object} gmeConfig - global configuration
 * @constructor
 * @ignore
 */
function PluginCliManager(project, mainLogger, gmeConfig) {
    var blobClient = new BlobClientWithFSBackend(gmeConfig, mainLogger);

    PluginManagerBase.call(this, blobClient, project, mainLogger, gmeConfig);
}

// Inherit from PluginManagerBase
PluginCliManager.prototype = Object.create(PluginManagerBase.prototype);
PluginCliManager.prototype.constructor = PluginCliManager;

module.exports = PluginCliManager;