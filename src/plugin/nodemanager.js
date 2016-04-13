/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var PluginManagerBase = requireJS('plugin/managerbase'),
    BlobClientClass = requireJS('common/blob/BlobClient');

function PluginNodeManager(webgmeToken, project, mainLogger, gmeConfig) {
    var blobClient = new BlobClientClass({
            serverPort: gmeConfig.server.port,
            httpsecure: false,
            server: '127.0.0.1',
            webgmeToken: webgmeToken,
            logger: mainLogger.fork('BlobClient')
        });

    PluginManagerBase.call(this, blobClient, project, mainLogger, gmeConfig);

    this.serverSide = true;
}

// Inherit from PluginManagerBase
PluginNodeManager.prototype = Object.create(PluginManagerBase.prototype);
PluginNodeManager.prototype.constructor = PluginNodeManager;

module.exports = PluginNodeManager;
