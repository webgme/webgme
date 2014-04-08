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
        var isGoodExtraAsset = function(name,filePath){
            try{
                var file = FS.readFileSync(filePath+'/'+name+'.js','utf-8');
                if(file === undefined || file === null){
                    return false;
                } else {
                    return true;
                }
            } catch(e){
                return false;
            }
        };
        var getPluginNames = function(basePaths){
            var names = []; //we add only the "*.js" files from the directories
            basePaths = basePaths || [];
            for(var i=0;i<basePaths.length;i++){
                var additional = FS.readdirSync(basePaths[i]);
                for(var j=0;j<additional.length;j++){
                    if(names.indexOf(additional[j]) === -1){
                        if(isGoodExtraAsset(additional[j],PATH.join(basePaths[i],additional[j]))){
                            names.push(additional[j]);
                        }
                    }
                }
            }
            return names;
        };

        var addPluginPathsToRequirejs = function(basepaths){
            var requirejsBase = webGMEGlobal.baseDir,
                pluginNames = getPluginNames(basepaths);

            //we go through every plugin and we check where we are able to find the main part of it so we can set the plugin/pluginName path according that in requirejs
            var pluginPaths = {};
            for(var i in pluginNames) {
                var found = false;
                for (var j = 0; j < basepaths.length; j++) {
                    if (!found) {
                        try {
                            var items = FS.readdirSync(basepaths[j]);
                            if(items.indexOf(pluginNames[i]) !== -1){
                                pluginPaths['plugin/' + pluginNames[i]] = PATH.relative(requirejsBase,PATH.resolve(basepaths[j]));
                                found = true;
                            }
                        } catch (e) {
                            //do nothing as we will go on anyway
                            //console.error(e);
                        }
                    } else {
                        break;
                    }
                }
            }


            requirejs.config({
                paths: pluginPaths
            });
        };

        var main = function(CONFIG,pluginConfig,callback) {
            ASSERT(pluginConfig && pluginConfig.pluginName);

            var config,
                projectName = pluginConfig.projectName,
                branch = pluginConfig.branch,
                pluginName = pluginConfig.pluginName,
                selectedID = pluginConfig.selectedID,
                activeSelection = pluginConfig.activeSelection,
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
                "activeNode": selectedID,
                "activeSelection": activeSelection,
                "commit": null,
                "branchName": branch
            };

            addPluginPathsToRequirejs(CONFIG.pluginBasePaths);

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
