/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var PluginNodeManagerBase = require('./nodemanagerbase'),
    BlobClientClass = requireJS('common/blob/BlobClient');

function PluginNodeManager(webgmeToken, project, mainLogger, gmeConfig) {
    var blobClient = new BlobClientClass({
            serverPort: gmeConfig.server.port,
            httpsecure: false,
            server: '127.0.0.1',
            webgmeToken: webgmeToken,
            logger: mainLogger.fork('BlobClient')
        });

    PluginNodeManagerBase.call(this, blobClient, project, mainLogger, gmeConfig);
}

// Inherit from PluginNodeManagerBase
PluginNodeManager.prototype = Object.create(PluginNodeManagerBase.prototype);
PluginNodeManager.prototype.constructor = PluginNodeManager;

module.exports = PluginNodeManager;
