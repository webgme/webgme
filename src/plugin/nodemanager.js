/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var PluginNodeManagerBase = require('./nodemanagerbase'),
    BlobClient = requireJS('common/blob/BlobClient');

function PluginNodeManager(webGMESessionId, project, mainLogger, gmeConfig) {
    var blobClient = new BlobClient({
            serverPort: gmeConfig.server.port,
            httpsecure: false,
            server: '127.0.0.1',
            webgmeclientsession: webGMESessionId
        });

    PluginNodeManagerBase.call(this, blobClient, project, mainLogger, gmeConfig);
}

// Inherit from PluginNodeManagerBase
PluginNodeManager.prototype = Object.create(PluginNodeManagerBase.prototype);
PluginNodeManager.prototype.constructor = PluginNodeManager;

module.exports = PluginNodeManager;
