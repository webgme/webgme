define([
    'util/assert',
    'plugin/PluginManagerBase',
    'plugin/PluginFSServer',
    'plugin/PluginResult',
    'core/coreforplugins',
    'storage/serveruserstorage',
    'fs',
    'path',
    'logManager'
],function(
    ASSERT,
    PluginManager,
    PluginFSServer,
    errorResult,
    Core,
    Storage,
    FS,
    PATH,
    logManager
    ){

    function RunPlugin(){

        var main = function(CONFIG,pluginConfig,callback) {
            ASSERT(pluginConfig && pluginConfig.pluginName);

            var config,
                projectName = pluginConfig.projectName,
                branch = pluginConfig.branch || 'master',
                pluginName = pluginConfig.pluginName,
                activeNode = pluginConfig.activeNode,
                activeSelection = pluginConfig.activeSelection || [],
                Plugin,
                logger = logManager.create('runPlugin'),
                storage,
                plugins = {};

            config = {
                "host": CONFIG.mongoip,
                "port": CONFIG.mongoport,
                "database": CONFIG.mongodatabase,
                "project": projectName,
                "token": "",
                "activeNode": activeNode,
                "activeSelection": activeSelection,
                "commit": null,
                "branchName": branch
            };

            // TODO: set WebGMEGlobalConfig if required

            Plugin = requirejs('plugin/' + pluginName + '/' + pluginName + '/' + pluginName);


            logManager.setLogLevel(5);
            logger.info('Given plugin : ' + pluginName);
            logger.info(JSON.stringify(config, null, 2));
            logger.info(JSON.stringify(CONFIG.pluginBasePaths, null, 2));

            storage = new Storage({'host': config.host, 'port': config.port, 'database': config.database});

            plugins[pluginName] = Plugin;

            storage.openDatabase(function (err) {
                if (!err) {
                    storage.openProject(config.project, function (err, project) {
                        if (!err) {

                            var pluginManager = new PluginManager(project, Core, plugins);

                            // TODO: put this file to the right location
                            var outputPath = PATH.resolve('.');

                            logger.debug('Artifact path: ' + outputPath);

                            // FIXME: for some reason this does not work.
                            config.FS = new PluginFSServer({outputpath: outputPath});

                            pluginManager.executePlugin(pluginName, config, function (err, result) {
                                logger.debug(JSON.stringify(result, null, 2));

                                project.closeProject();
                                storage.closeDatabase();
                                if (callback) {
                                    callback(err, result);
                                }
                            });
                        } else {
                            logger.error(err);
                            if (callback) {
                                callback(err, errorResult);
                            }
                        }
                    });
                } else {
                    logger.error(err);
                    if (callback) {
                        callback(err, errorResult);
                    }
                }
            });

        };

        return {
            main:main
        }
    }

    return RunPlugin();
});
