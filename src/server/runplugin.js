define([
  'util/assert',
  'plugin/PluginManagerBase',
  'blob/BlobRunPluginClient',
  'plugin/PluginResult',
  'core/core',
  'storage/serveruserstorage',
  'fs',
  'path',
  'logManager',
  'blob/BlobFSBackend',
  'blob/BlobS3Backend'
], function (ASSERT, PluginManager, BlobRunPluginClient, PluginResult, Core, Storage, FS, PATH, logManager, BlobFSBackend, BlobS3Backend) {

  function RunPlugin() {

    var main = function (CONFIG, pluginConfig, callback) {
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
        plugins = {},
        errorResult = new PluginResult();

      config = {
        "host": CONFIG.mongoip,
        "port": CONFIG.mongoport,
        "database": CONFIG.mongodatabase,
        "user": CONFIG.mongouser,
        "pwd": CONFIG.mongopwd,
        "project": projectName,
        "token": "",
        "activeNode": activeNode,
        "activeSelection": activeSelection,
        "commit": null,
        "branchName": branch,
        "pluginConfig": pluginConfig.pluginConfig
      };

      // TODO: set WebGMEGlobalConfig if required

      Plugin = requirejs('plugin/' + pluginName + '/' + pluginName + '/' + pluginName);

      logManager.setLogLevel(5);
      logger.info('Given plugin : ' + pluginName);
      logger.info(JSON.stringify(config, null, 2));
      logger.info(JSON.stringify(CONFIG.pluginBasePaths, null, 2));

      storage = new Storage({
        'host': config.host,
        'port': config.port,
        'database': config.database,
        'user': config.user,
        'pwd': config.pwd
      });

      plugins[pluginName] = Plugin;

      storage.openDatabase(function (err) {
        if (!err) {
          storage.openProject(config.project, function (err, project) {
            if (!err) {

              var pluginManager = new PluginManager(project, Core, plugins);
              var blobBackend = new BlobFSBackend();
              //var blobBackend  = new BlobS3Backend();

              config.blobClient = new BlobRunPluginClient(blobBackend);

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
      main: main
    }
  }

  return RunPlugin();
});
