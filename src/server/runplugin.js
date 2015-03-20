/*globals define, requirejs*/
/*jshint node: true*/

/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'util/assert',
    'plugin/PluginManagerBase',
    'blob/BlobRunPluginClient',
    'plugin/PluginResult',
    'core/core',
    'storage/serveruserstorage',
    'common/util/opencontext',
    'fs',
    'path',
    'logManager',
    'blob/BlobFSBackend',
    'blob/BlobS3Backend'],
function (ASSERT,
          PluginManager,
          BlobRunPluginClient,
          PluginResult,
          Core,
          Storage,
          openContext,
          FS,
          PATH,
          logManager,
          BlobFSBackend,
          BlobS3Backend) {
    'use strict';
    function RunPlugin() {

        var main = function (gmeConfig, pluginConfig, callback) {
            ASSERT(pluginConfig && pluginConfig.pluginName);

            var Plugin,
                pluginName = pluginConfig.pluginName,
                logger = logManager.create('runPlugin'),
                storage,
                plugins = {},
                contextParams,
                errorResult = new PluginResult();

            pluginConfig.activeSelection = pluginConfig.activeSelection || [];

            Plugin = requirejs('plugin/' + pluginName + '/' + pluginName + '/' + pluginName);

            logManager.setLogLevel(5);
            logger.info('Given plugin : ' + pluginName);
            logger.info(JSON.stringify(pluginConfig, null, 2));
            logger.info(JSON.stringify(gmeConfig.plugin.basePaths, null, 2));

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
                    if (callback) {
                        callback(err, errorResult);
                    }
                    return;
                }
                var pluginManager = new PluginManager(context.project, Core, plugins, gmeConfig);
                var blobBackend = new BlobFSBackend(gmeConfig);
                //var blobBackend  = new BlobS3Backend();

                pluginConfig.blobClient = new BlobRunPluginClient(blobBackend);
                pluginConfig.commit = context.commitHash;

                // FIXME: pluginConfig supposed to be managerConfig!
                pluginManager.executePlugin(pluginName, pluginConfig, function (err, result) {
                    logger.debug(JSON.stringify(result, null, 2));
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

    return RunPlugin();
});


