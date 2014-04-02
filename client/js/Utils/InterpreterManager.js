define(['core/core',
        'plugin/PluginManagerBase',
        'plugin/PluginResult',
        'plugin/PluginFSClient',
        'js/Dialogs/PluginConfig/PluginConfigDialog'
                                    ], function (Core,
                                               PluginManagerBase,
                                               PluginResult,
                                               PluginFSClient,
                                               PluginConfigDialog) {
    "use strict";

    var ClientInterpreterManager = function (client) {
        this._client = client;
        //this._manager = new PluginManagerBase();

        // Test PluginFS
//        var pluginFS = new PluginFSClient();
//        pluginFS.createArtifact('output');
//        pluginFS.addFile('log.txt', 'Hello world\r\nNew line here...\r\n');
//        pluginFS.saveArtifact();

    };

//    var getContext = function(client,callback) {
//        var context = { storage: client.getProjectObject(), project:client.getProjectObject()};
//        context.core = new Core(context.storage,{corerel:2});
//        context.commitHash = client.getActualCommit();
//        context.selected = WebGMEGlobal.State.getActiveSelection() || [];
//        context.selected = context.selected[0] || null; //TODO allow multiple objects in the selection and pass active object as well
//        context.storage.loadObject(context.commitHash, function(err, commitObj) {
//            context.core.loadRoot(commitObj.root, function(err, rootNode) {
//                if(!err){
//                    context.rootNode = rootNode;
//                    if(typeof context.selected === 'string'){
//                        context.core.loadByPath(context.rootNode, context.selected, function (err, selectedNode) {
//                            if(!err){
//                                context.selectedNode = selectedNode;
//                                callback(null,context);
//                            } else {
//                                callback("unable to load selected object",context);
//                            }
//                        });
//                    } else {
//                        context.selectedNode = null;
//                        callback(null,context);
//                    }
//                } else {
//                    callback("unable to load root",context);
//                }
//            });
//        });
//    };

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
                        }
                    }
                    d.show(hackedConfig, function (updatedConfig) {
                        //when Save&Run is clicked in the dialog
                        var globalconfig = updatedConfig['Global Options'];
                        delete updatedConfig['Global Options'];
                        //#2: save it back and run the plugin
                        if (configSaveCallback) {
                            configSaveCallback(updatedConfig);

                            // TODO: if global config says try to merge branch then we should pass the name of the branch
                            var config = {
                                "project": self._client.getActiveProject(),
                                "token": "",
                                "selected": null,
                                "commit": self._client.getActualCommit(), //"#668b3babcdf2ddcd7ba38b51acb62d63da859d90",
                                //"root": ""
                                "branchName": self._client.getActualBranch() // this has priority over the commit
                            };

                            // FIXME: selected object should be an array of objects
                            // FIXME: active object should be a single object on which the interpreter was called
                            config.selected = WebGMEGlobal.State.getActiveSelection() || [];
                            config.selected = config.selected[0] || null;

                            //config.active = WebGMEGlobal.State.getActiveObject() || null;

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
                                        var resultObject = new PluginResult();
                                        resultObject.deserialize(result);
                                        callback(resultObject);
                                    }
                                });
                            } else {
                                config.FS = new PluginFSClient();

                                pluginManager.executePlugin(name, config, function (err, result) {
                                    //console.log(result);
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
                console.error('unable to load plugin');
                callback(null); //TODO proper result
            }
        });
    };

    //TODO somehow it would feel more right if we do run in async mode, but if not then we should provide getState and getResult synchronous functions as well

    return ClientInterpreterManager;
});
