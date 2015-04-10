/*globals requireJS*/
/*jshint node: true*/

/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var ASSERT = requireJS('common/util/assert'),
    openContext = requireJS('common/util/opencontext'),
    Core = requireJS('common/core/core'),

    PluginManager = requireJS('plugin/PluginManagerBase'),
    PluginResult = requireJS('plugin/PluginResult'),

    BlobFSBackend = require('./middleware/blob/BlobFSBackend'),
    BlobRunPluginClient = require('./middleware/blob/BlobRunPluginClient'),
    Storage = require('./storage/serveruserstorage'),
    Logger = require('./logger');

function RunPlugin() {
    var main = function (storage, gmeConfig, managerConfig, pluginConfig, callback) {
        ASSERT(managerConfig && managerConfig.pluginName && callback);

        var Plugin,
            pluginName = managerConfig.pluginName,
            logger = Logger.create('gme:server:runPlugin', gmeConfig.server.log),
            plugins = {},
            contextParams,
            errorResult = new PluginResult();

        managerConfig.activeSelection = managerConfig.activeSelection || [];

        logger.info('Given plugin : ' + pluginName);
        logger.info('managerConfig', {metadata: managerConfig});
        logger.debug('basePaths', {metadata: gmeConfig.plugin.basePaths});

        Plugin = requireJS('plugin/' + pluginName + '/' + pluginName + '/' + pluginName);

        storage = storage || new Storage({
            globConf: gmeConfig,
            log: logger
        });

        plugins[pluginName] = Plugin;
        managerConfig.branch = managerConfig.branch || 'master';

        contextParams = {
            projectName: managerConfig.projectName,
            branchName: managerConfig.branch
        };

        openContext(storage, gmeConfig, contextParams, function (err, context) {
            if (err) {
                logger.error(err);
                callback(err, errorResult);
                return;
            }
            var pluginManager = new PluginManager(context.project, Core, Logger, plugins, gmeConfig);
            var blobBackend = new BlobFSBackend(gmeConfig);
            //var blobBackend  = new BlobS3Backend();

            managerConfig.blobClient = new BlobRunPluginClient(blobBackend);
            managerConfig.commit = context.commitHash;

            managerConfig.pluginConfig = pluginConfig || {};
            pluginManager.executePlugin(pluginName, managerConfig, function (err, result) {
                logger.debug('result', {metadata: result});
                context.project.closeProject(function () {
                    storage.closeDatabase(function () {
                        callback(err, result);
                    });
                });
            });
        });
    };

    return {
        main: main
    };
}

module.exports = RunPlugin();


