/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var PluginManagerBase = requireJS('plugin/PluginManagerBase'),
    Core = requireJS('common/core/core'),

    BlobFSBackend = require('./middleware/blob/BlobFSBackend'),
    BlobRunPluginClient = require('./middleware/blob/BlobRunPluginClient');

function PluginCliManager(storage, project, plugins, mainLogger, gmeConfig) {
    PluginManagerBase.call(this, storage, Core, mainLogger, plugins, gmeConfig);
    var blobBackend = new BlobFSBackend(gmeConfig),
        blobClient = new BlobRunPluginClient(blobBackend);

}

// Inherit from PluginManagerBase
PluginCliManager.prototype = Object.create(PluginManagerBase.prototype);
PluginCliManager.prototype.constructor = PluginCliManager;