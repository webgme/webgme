/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var PluginManagerBase = requireJS('plugin/PluginManagerBase'),
    Core = requireJS('common/core/core'),
    BlobClient = requireJS('common/blob/BlobClient');

function PluginNodeManager(webGMESessionId, project, plugins, mainLogger, gmeConfig) {
    PluginManagerBase.call(this, project, Core, mainLogger, plugins, gmeConfig);
    var blobClient = new BlobClient({
        serverPort: gmeConfig.server.port,
        httpsecure: gmeConfig.server.https.enable,
        server: '127.0.0.1',
        webgmeclientsession: webGMESessionId
    });

}

// Inherit from PluginManagerBase
PluginNodeManager.prototype = Object.create(PluginManagerBase.prototype);
PluginNodeManager.prototype.constructor = PluginNodeManager;