var requirejs = require("requirejs"),
    BASEPATH = __dirname + "/../..",
    WEBGME = require(BASEPATH + '/../webgme');
requirejs.config({
    nodeRequire: require,
    baseUrl: BASEPATH,
    paths: {
        "logManager": "common/LogManager",
        "storage": "common/storage",
        "core": "common/core",
        "server": "server",
        "auth": "server/auth",
        "util": "common/util",
        "baseConfig" : "bin/getconfig",
        "webgme": "webgme",
        "plugin": "plugin",
        "worker": "server/worker",
        "coreclient": "common/core/users",
        "blob": "middleware/blob"
    }
});
requirejs(['worker/constants',
        'core/core',
        'storage/serveruserstorage',
        'util/guid',
        'coreclient/dumpmore',
        'logManager',
        'fs',
        'path',
        'blob/BlobServerClient',
        'plugin/PluginManagerBase',
        'plugin/PluginResult',
        'storage/clientstorage',
        'coreclient/serialization',
        'auth/gmeauth'],
function(CONSTANT,Core,Storage,GUID,DUMP,logManager,FS,PATH,BlobServerClient,PluginManagerBase,PluginResult,ConnectedStorage,Serialization,GMEAUTH){
    var storage = null,
        core = null,
        result = null,
        resultReady = false,
        resultRequested = false,
        resultId = null,
        error = null,
        initialized = false,
        pluginBasePaths = null,
        interpreteroutputdirectory = null,
        serverPort = 80,
        AUTH =null;

    var initResult = function(){
        core = null;
        result = null;
        resultReady = false;
        resultRequested = false;
        resultId = null;
        error = null;
    };
    var initialize = function(parameters){
        console.log(webGMEGlobal);
        if(initialized !== true){
            initialized = true;
            if(parameters.auth){
                AUTH = GMEAUTH(parameters.auth);
            }
            pluginBasePaths = parameters.pluginBasePaths;
            webGMEGlobal.setConfig({paths:parameters.paths,pluginBasePaths:parameters.pluginBasePaths});
            serverPort = parameters.serverPort || 80;
            interpreteroutputdirectory = parameters.interpreteroutputdirectory || "";
            if(interpreteroutputdirectory){
                try{
                    FS.mkdirSync(PATH.resolve(interpreteroutputdirectory));
                } catch(e){
                    console.log('output directory cannot be created');
                }
            }
            storage = new Storage({'host':parameters.ip,'port':parameters.port,'database':parameters.db,'log':logManager.create('SERVER-WORKER-'+process.pid)});
            storage.openDatabase(function(err){
                if(err){
                    initialized = false;
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.info,info:'worker initialization failed, try again'});
                } else {
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.initialized});
                }
            });
        }
    };
    var exportLibrary = function(name,hash,libraryRootPath,callback){
        if(!storage){
            return callback('no active data connection');
        }
        if(!initialized){
            return callback('worker has not been initialized yet');
        }

        storage.openProject(name,function(err,project){
            if(err){
                return callback(err);
            }
            var core = new Core(project);
            core.loadRoot(hash,function(err,root){
                if(err){
                    return callback(err);
                }

                core.loadByPath(root,libraryRootPath,function(err,libraryRoot){
                    if(err){
                        return callback(err);
                    }

                    Serialization.export(core,libraryRoot,callback);
                });
            });
        });

    };
    var dumpMoreNodes = function(name,hash,nodePaths,callback){
        if(storage){
            if(initialized){
                storage.openProject(name,function(err,project){
                    if(err){
                        callback(err);
                    } else {
                        var core = new Core(project);
                        core.loadRoot(hash,function(err,root){
                            if(err){
                                callback(err);
                            } else {
                                var nodes = [],
                                    needed = nodePaths.length || 0,
                                    loadError = null;
                                if(needed > 0){
                                    for(var i=0;i<nodePaths.length;i++){
                                        core.loadByPath(root,nodePaths[i],function(err,node){
                                            loadError = loadError || err;
                                            if(node !== undefined && node !== null){
                                                nodes.push(node);
                                            }
                                            if(--needed === 0){
                                                if(loadError){
                                                    callback(loadError);
                                                } else {
                                                    DUMP(core,nodes,"",'guid',callback);
                                                }
                                            }
                                        })
                                    }
                                } else {
                                    callback(null,null);
                                }
                            }
                        });
                    }
                });
            } else {
                callback('worker has not been initialized yet');
            }
        } else {
            callback('no active data connection');
        }
    };

    //TODO the getContext should be refactored!!!
    var getProject = function(projectName,sessionId,callback){
        var pluginStorage = new ConnectedStorage({type:'node',host:'127.0.0.1',port:serverPort,log:logManager.create('SERVER-WORKER-PLUGIN-'+process.pid),webGMESessionId:sessionId});
        pluginStorage.openDatabase(function(err){
            if(!err){
                if(projectName) {
                    pluginStorage.openProject(projectName, function (err, project) {
                        if (!err) {
                            callback(null, project);
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error('invalid project name'));
                }
            } else {
                callback(new Error('cannot open database'));
            }
        });
    };
    var isGoodExtraAsset = function(name,path){
        try{
            var file = FS.readFileSync(path+'/'+name+'.js','utf-8');
            if(file === undefined || file === null){
                return false;
            } else {
                return true;
            }
        } catch(e){
            return false;
        }
    };
    var getPluginBasePathByName = function(pluginName){
        if(pluginBasePaths && pluginBasePaths.length){
            for(var i=0;i<pluginBasePaths.length;i++){
                var additional = FS.readdirSync(pluginBasePaths[i]);
                for(var j=0;j<additional.length;j++){
                    if(additional[j] === pluginName){
                        if(isGoodExtraAsset(additional[j],PATH.join(pluginBasePaths[i],additional[j]))){
                            return pluginBasePaths[i];
                        }
                    }
                }
            }
        } else {
            return null;
        }
    };

    var getInterpreter = function(name){
        return requirejs('plugin/'+name+'/'+name+'/'+name);
    };
    var runInterpreter = function(userId,name,sessionId,context,callback){
        var interpreter = getInterpreter(name);
        if(interpreter){
            getProject(context.managerConfig.project,sessionId,function(err,project){
                if(!err){
                    project.setUser(userId);
                    var plugins = {};
                    plugins[name] = interpreter;
                    var manager = new PluginManagerBase(project,Core,plugins);
                    context.managerConfig.blobClient = new BlobServerClient({serverPort:serverPort,sessionId:sessionId});

                    manager.initialize(null, function (pluginConfigs, configSaveCallback) {
                        if (configSaveCallback) {
                            configSaveCallback(context.pluginConfigs);
                        }

                        manager.executePlugin(name,context.managerConfig,function(err,result){
                            if(!err && result){
                                callback(null,result.serialize());
                            } else {
                                var newErrorPluginResult = new PluginResult();
                                callback(err,newErrorPluginResult.serialize());
                            }
                        });

                    });
                } else {
                    var newErrorPluginResult = new PluginResult();
                    callback(new Error('unable to get project'),newErrorPluginResult.serialize());
                }
            });
        } else {
            var newErrorPluginResult = new PluginResult();
            callback(new Error('unable to load plugin'),newErrorPluginResult.serialize());
        }
    };

    var getAllProjectsInfo = function(userId,callback){
        var projectNames,
            userAuthInfo = null,
            completeInfo = {},
            needed,
            i,
            filterProjectList = function(cb) {
                if(AUTH === null){
                    return cb(null);
                }

                if(typeof userId === 'string'){
                    AUTH.getUserAuthInfo(userId,function(err,userData){
                        if(err){
                            projectNames = [];
                            return cb(err);
                        }

                        userAuthInfo = userData;

                        //the actual filtering
                        var i,filtered = [];
                        for(i=0;i<projectNames.length;i++){
                            if(userAuthInfo[projectNames[i]]){
                                filtered.push(projectNames[i]);
                            }
                        }
                        projectNames = filtered;
                        cb(null);
                    });
                } else {
                    projectNames = []; //we have authentication yet doesn't get valid user name...
                    return cb(new Error('invalid user'));

                }
            },
            addUserAuthInfo = function(projectName){
                if(userAuthInfo === null){
                    completeInfo[projectName].rights = {read:true,write:true,delete:true};
                } else {
                    completeInfo[projectName].rights = userAuthInfo[projectName] || {read:false,write:false,delete:false};
                }
            },
            getProjectInfo = function(name,cb){
                storage.openProject(name,function(err,project){
                    if(err){
                        return cb(err);
                    }

                    project.getBranchNames(function(err,branches){
                        return cb(err,name,branches);
                    });
                });
            },
            projectInfoReceived = function(err,name,branches){
                if(!err){
                    completeInfo[name] = {branches:branches};
                    addUserAuthInfo(name);
                }

                if(--needed === 0){
                    //TODO here we first should go and add the user right info
                    callback(null,completeInfo);
                }
            };
        if(storage){
            if(initialized){
                storage.getProjectNames(function(err,projectlist){
                    if(err){
                        return callback(new Error('cannot get project name list'));
                    }
                    projectNames = projectlist;
                    filterProjectList(function(err){
                        if(err){
                            callback(err);
                        }
                        needed = projectNames.length;
                        for(i=0;i<projectNames.length;i++){
                            getProjectInfo(projectNames[i],projectInfoReceived);
                        }
                    });

                });
            } else {
                callback(new Error('worker not yet initialized'));
            }
        } else {
            callback(new Error('no active data connection'));
        }

    };

    var setBranch = function(sessionId,projectName,branchName,oldHash,newHash,callback){
        if(storage){
            if(initialized){
                storage.getProjectNames(function(err,projectlist){
                    if(err){
                        return callback(err);
                    }

                    if(projectlist.indexOf(projectName) === -1){
                        return callback(new Error('no such project'));
                    }
                    getProject(projectName,sessionId,function(err,project){
                            if(err){
                                return callback(err);
                            }

                            project.setBranchHash(branchName,oldHash,newHash,callback);
                        });
                    });
            } else {
                callback(new Error('worker not yet initialized'));
            }
        } else {
            callback(new Error('no active data connection'));
        }
    };
    //main message processing loop
    process.on('message',function(parameters){
        parameters = parameters || {};
        parameters.command = parameters.command || CONSTANT.workerCommands.getResult; //default command

        switch(parameters.command){
            case CONSTANT.workerCommands.initialize:
                initialize(parameters);
                break;
            case CONSTANT.workerCommands.dumpMoreNodes:
                if(typeof parameters.name === 'string' && typeof parameters.hash === 'string' && parameters.nodes && parameters.nodes.length){
                    resultId = GUID();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:null,resid:resultId});
                    dumpMoreNodes(parameters.name,parameters.hash,parameters.nodes,function(err,r){
                        if(resultRequested === true){
                            initResult();
                            process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:r});
                        } else {
                            resultReady = true;
                            error = err;
                            result = r;
                        }
                    });
                } else {
                    initResult();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:'invalid parameters'});
                }
                break;
            case CONSTANT.workerCommands.generateJsonURL:
                resultId = GUID();
                process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:null,resid:resultId});
                if(resultRequested === true){
                    initResult();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:parameters.object});
                } else {
                    resultReady = true;
                    error = null;
                    result = parameters.object;
                }
                break;
            case CONSTANT.workerCommands.getResult:
                if(resultReady === true){
                    var e = error,
                        r = result;

                    initResult();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:e,result:r});
                } else {
                    resultRequested = true;
                }
                break;
            case CONSTANT.workerCommands.executePlugin:
                if( typeof parameters.name === 'string' && typeof parameters.context === 'object'){
                    runInterpreter(parameters.user,parameters.name,parameters.webGMESessionId,parameters.context,function(err,result){
                        process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:result});
                    });
                } else {
                    initResult();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:'invalid parameters',result:{}});
                }
                break;
            case CONSTANT.workerCommands.exportLibrary:
                if( typeof parameters.name === 'string' && typeof parameters.hash === 'string' && typeof parameters.path === 'string'){
                    resultId = GUID();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:null,resid:resultId});
                    exportLibrary(parameters.name,parameters.hash,parameters.path,function(err,r){
                        if(resultRequested === true){
                            initResult();
                            process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:r});
                        } else {
                            resultReady = true;
                            error = err;
                            result = r;
                        }
                    });
                } else {
                    initResult();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:'invalid parameters'});
                }
                break;
            case CONSTANT.workerCommands.getAllProjectsInfo:
                resultId = GUID();
                process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:null,resid:resultId});
                getAllProjectsInfo(parameters.user,function(err,r){
                    if(resultRequested === true){
                        initResult();
                        process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:r});
                    } else {
                        resultReady = true;
                        error = err;
                        result = r;
                    }
                });
                break;
            case CONSTANT.workerCommands.setBranch:
                resultId = GUID();
                process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:null,resid:resultId});
                setBranch(parameters.webGMESessionId,parameters.project,parameters.branch,parameters.old,parameters.new,function(err,r){
                    if(resultRequested === true){
                        initResult();
                        process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:r});
                    } else {
                        resultReady = true;
                        error = err;
                        result = r;
                    }
                });
                break;
            default:
                process.send({error:'unknown command'});
        }
    });

    process.send({pid:process.pid,type:CONSTANT.msgTypes.initialize});
});
