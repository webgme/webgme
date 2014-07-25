/*globals define, _, requirejs, WebGMEGlobal*/

define(['core/core',
        'plugin/PluginManagerBase',
        'plugin/PluginResult',
        'blob/BlobClient',
        'js/Dialogs/PluginConfig/PluginConfigDialog'
                                    ], function (Core,
                                               PluginManagerBase,
                                               PluginResult,
                                               BlobClient,
                                               PluginConfigDialog) {
    "use strict";

    var ClientInterpreterManager = function (client) {
        this._client = client;
        //this._manager = new PluginManagerBase();
        this._savedConfigs = {};
    };

    var getPlugin = function(name,callback){
        requirejs(['/plugin/'+name+'/'+name+'/'+name],
            function(InterpreterClass){
                callback(null, InterpreterClass);
            },
            function(err){
                callback(err,null);
            }
        );
    };

    ClientInterpreterManager.prototype.run = function (name,callback) {
        var self = this;
        getPlugin(name,function(err,plugin){
            if(!err && plugin) {
                var plugins = {};
                plugins[name] = plugin;
                var pluginManager = new PluginManagerBase(self._client.getProjectObject(), Core, plugins);
                pluginManager.initialize(null, function (pluginConfigs, configSaveCallback) {
                    //#1: display config to user
                    var d = new PluginConfigDialog();
                    var hackedConfig = {
                        'Global Options': [
                            {
                                "name": "runOnServer",
                                "displayName": "Execute on Server",
                                "description": '',
                                "value": false, // this is the 'default config'
                                "valueType": "boolean",
                                "readOnly": false
                            }
                        ]
                    };

                    for (var i in pluginConfigs) {
                        if (pluginConfigs.hasOwnProperty(i)) {
                            hackedConfig[i] = pluginConfigs[i];

                            // retrieve user settings from previous run
                            if (self._savedConfigs.hasOwnProperty(i)) {
                                var iConfig = self._savedConfigs[i];
                                var len = hackedConfig[i].length;

                                while (len--) {
                                    if (iConfig.hasOwnProperty(hackedConfig[i][len].name)) {
                                        hackedConfig[i][len].value = iConfig[hackedConfig[i][len].name];
                                    }
                                }

                            }
                        }
                    }

                    d.show(hackedConfig, function (updatedConfig) {
                        //when Save&Run is clicked in the dialog
                        var globalconfig = updatedConfig['Global Options'];
                        delete updatedConfig['Global Options'];

                        // save config from user
                        for (var i in updatedConfig) {
                            self._savedConfigs[i] = updatedConfig[i];
                        }

                        //#2: save it back and run the plugin
                        if (configSaveCallback) {
                            configSaveCallback(updatedConfig);

                            // TODO: if global config says try to merge branch then we should pass the name of the branch
                            var config = {
                                "project": self._client.getActiveProjectName(),
                                "token": "",
                                "activeNode": WebGMEGlobal.State.getActiveObject(), // active object in the editor
                                "activeSelection": WebGMEGlobal.State.getActiveSelection() || [], // selected objects
                                "commit": self._client.getActualCommit(), //"#668b3babcdf2ddcd7ba38b51acb62d63da859d90",
                                "branchName": self._client.getActualBranch() // this has priority over the commit if not null
                            };

                            if(globalconfig.runOnServer === true){
                                var context = {
                                    managerConfig: config,
                                    pluginConfigs:updatedConfig
                                };
                                self._client.runServerPlugin(name,context,function(err,result){
                                    if(err){
                                        console.error(err);
                                        callback(new PluginResult()); //TODO return proper error result
                                    } else {
                                        var resultObject = new PluginResult(result);
                                        callback(resultObject);
                                    }
                                });
                            } else {
                                config.blobClient = new BlobClient();

                                pluginManager.executePlugin(name, config, function (err, result) {
                                    if (err) {
                                        console.error(err);
                                    }
                                    callback(result);
                                });
                            }
                        }
                    });
                });
            } else {
                console.error(err);
                console.error('unable to load plugin');
                callback(null); //TODO proper result
            }
        });
    };

    //TODO somehow it would feel more right if we do run in async mode, but if not then we should provide getState and getResult synchronous functions as well

    return ClientInterpreterManager;
});
