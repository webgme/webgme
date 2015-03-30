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
    var main = function (gmeConfig, pluginConfig, callback) {
        ASSERT(pluginConfig && pluginConfig.pluginName && callback);

        var Plugin,
            pluginName = pluginConfig.pluginName,
            logger = Logger.create('gme:server:runPlugin', gmeConfig.server.log),
            storage,
            plugins = {},
            contextParams,
            errorResult = new PluginResult();

        pluginConfig.activeSelection = pluginConfig.activeSelection || [];

        Plugin = requireJS('plugin/' + pluginName + '/' + pluginName + '/' + pluginName);

        logger.info('Given plugin : ' + pluginName);
        logger.info('pluginConfig', {metadata: pluginConfig});
        logger.debug('basePaths', {metadata: gmeConfig.plugin.basePaths});

        storage = new Storage({
            globConf: gmeConfig,
            log: logger
        });

        plugins[pluginName] = Plugin;
        pluginConfig.branch = pluginConfig.branch || 'master';

        contextParams = {
            projectName: pluginConfig.projectName,
            branchName: pluginConfig.branch
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

            pluginConfig.blobClient = new BlobRunPluginClient(blobBackend);
            pluginConfig.commit = context.commitHash;

            // FIXME: pluginConfig supposed to be managerConfig!
            pluginManager.executePlugin(pluginName, pluginConfig, function (err, result) {
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


