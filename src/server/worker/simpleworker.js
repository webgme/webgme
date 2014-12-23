/*global __dirname, webGMEGlobal */
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
    'use strict';
    var storage = null,
        core = null,
        result = null,
        resultReady = false,
        resultRequested = false,
        resultId = null,
        error = null,
        initialized = false,
        AUTH =null,
        _addOn = null,
        _CONFIG = null;

    var initResult = function(){
        core = null;
        result = null;
        resultReady = false;
        resultRequested = false;
        resultId = null;
        error = null;
    };
    var initialize = function(parameters){
        if(initialized !== true){
            initialized = true;

            webGMEGlobal.setConfig(parameters.globConf);
            _CONFIG = parameters.globConf;
            if(_CONFIG.authorization === true){
                AUTH = GMEAUTH(parameters.auth);
            }
            storage = new Storage({'host':_CONFIG.mongoip,'port':_CONFIG.mongoport,'database':_CONFIG.mongodatabase,'log':logManager.create('SERVER-WORKER-'+process.pid)});
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
    var getConnectedStorage = function(sessionId,callback){
        var connStorage = new ConnectedStorage({type:'node',host:'127.0.0.1',port:_CONFIG.port,log:logManager.create('SERVER-WORKER-PLUGIN-'+process.pid),webGMESessionId:sessionId});
        connStorage.openDatabase(function(err){
            callback(err,connStorage);
        });
    };
    var getConnectedProject = function(storage,projectName,callback){
        storage.getProjectNames(function(err,names){
            if(err){
                return callback(err);
            }
            if(names.indexOf(projectName) === -1){
                return callback(new Error('nonexsistent project'));
            }
            storage.openProject(projectName,callback);
        });
    };
    var getProject = function(projectName,sessionId,callback){
        getConnectedStorage(sessionId,function(err,storage){
            if(err){
                return callback(err);
            }
            getConnectedProject(storage,projectName,callback);
        });
    };

    var getPlugin = function(name){
        return requirejs('plugin/'+name+'/'+name+'/'+name);
    };
    var executePlugin = function(userId,name,sessionId,context,callback){
        var interpreter = getPlugin(name);
        if(interpreter){
            getProject(context.managerConfig.project,sessionId,function(err,project){
                if(!err){
                    project.setUser(userId);
                    var plugins = {};
                    plugins[name] = interpreter;
                    var manager = new PluginManagerBase(project,Core,plugins);
                    context.managerConfig.blobClient = new BlobServerClient({serverPort:_CONFIG.port,sessionId:sessionId});

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

    var createProject = function(sessionId,name,jsonProject,callback){
        getConnectedStorage(sessionId,function(err,storage){
            if(err){
                return callback(""+err);
            }

            storage.openProject(name,function(err,project){
                if(err){
                    return callback(""+err);
                }

                var core = new Core(project),
                    root = core.createNode({parent:null,base:null});
                Serialization.import(core,root,jsonProject,function(err){
                    if(err){
                        return storage.deleteProject(name,function(){
                            callback(""+err);
                        });
                    }

                    core.persist(root,function(err){});
                    var rhash = core.getHash(root),
                        chash = project.makeCommit([],rhash,"project imported",function(err){});
                    project.getBranchHash("master","#hack",function(err,oldhash){
                        if(err){
                            return callback(""+err);
                        }
                        project.setBranchHash("master",oldhash,chash,callback);
                    });
                });
            });
        });
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
                        if(needed > 0){
                            for(i=0;i<projectNames.length;i++){
                                getProjectInfo(projectNames[i],projectInfoReceived);
                            }
                        } else {
                            return callback(new Error('there is no project on server'));
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

    //addOn functions
    var getAddOn = function(name){
        return requirejs('addon/'+name+'/'+name+'/'+name);
    };
    var initConnectedWorker = function(name,sessionId,projectName,branchName,callback){
        var addOnClass = getAddOn(name),
            connStorage = null;
        //for instance creation we need the Core class and the Storage object
        getConnectedStorage(sessionId,function(err,cs){
            if(!err && cs){
                connStorage = cs;
                _addOn = new addOnClass(Core,connStorage);
                //for the initialization we need the project as well
                getConnectedProject(connStorage,projectName,function(err,project){
                    if(err){
                        return callback(err);
                    }
                    _addOn.start({projectName:projectName,branchName:branchName,project:project},callback);
                });
            } else {
                callback('unable to connect user\'s storage');
            }
        });
    };
    var connectedWorkerQuery = function(parameters,callback){
        if(_addOn){
            _addOn.query(parameters,callback);
        } else {
            callback('the addon is not running');
        }
    };

    var connectedworkerStop = function(callback){
        if(_addOn){
            _addOn.stop(function(err){
                if(err){
                    return callback(err);
                }
                _addOn = null;
                callback(null);
            });
        } else {
            callback(null);
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
                    executePlugin(parameters.user,parameters.name,parameters.webGMESessionId,parameters.context,function(err,result){
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
            case CONSTANT.workerCommands.createProjectFromFile:
                if( typeof parameters.name === 'string' && typeof parameters.json === 'object'){
                    resultId = GUID();
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:null,resid:resultId});
                    createProject(parameters.webGMESessionId,parameters.name,parameters.json,function(err){
                        if(resultRequested === true){
                            initResult();
                            process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:null});
                        } else {
                            resultReady = true;
                            error = err;
                            result = null;
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
            case CONSTANT.workerCommands.connectedWorkerStart:
                initConnectedWorker(parameters.workerName,parameters.sessionId,parameters.project,parameters.branch,function(err){
                    if(err){
                        process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:err,resid:null});
                    } else {
                        process.send({pid:process.pid,type:CONSTANT.msgTypes.request,error:null,resid:process.pid});
                    }
                });
                break;
            case CONSTANT.workerCommands.connectedWorkerQuery:
                connectedWorkerQuery(parameters,function(err,result){
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.query,error:err,result:result});
                });
                break;
            case CONSTANT.workerCommands.connectedWorkerStop:
                connectedworkerStop(function(err){
                    process.send({pid:process.pid,type:CONSTANT.msgTypes.result,error:err,result:null});
                });
                break;
            default:
                process.send({error:'unknown command'});
        }
    });

    process.send({pid:process.pid,type:CONSTANT.msgTypes.initialize});
});
