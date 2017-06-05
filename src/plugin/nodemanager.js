/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var url = require('url'),
    PluginManagerBase = requireJS('plugin/managerbase'),
    BlobClientClass = requireJS('common/blob/BlobClient');

function PluginNodeManager(webgmeToken, project, mainLogger, gmeConfig, webgmeUrl) {
    var params = {
            serverPort: gmeConfig.server.port,
            httpsecure: false,
            server: '127.0.0.1',
            webgmeToken: webgmeToken,
            logger: mainLogger.fork('BlobClient')
        },
        urlObj,
        blobClient;

    if (webgmeUrl) {
        urlObj = url.parse(webgmeUrl);
        params.serverPort = urlObj.port;
        params.httpsecure = urlObj.protocol === 'https';
        params.server = urlObj.hostname;
    }

    blobClient = new BlobClientClass(params);

    PluginManagerBase.call(this, blobClient, project, mainLogger, gmeConfig);

    this.serverSide = true;
}

// Inherit from PluginManagerBase
PluginNodeManager.prototype = Object.create(PluginManagerBase.prototype);
PluginNodeManager.prototype.constructor = PluginNodeManager;

module.exports = PluginNodeManager;
