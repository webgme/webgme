var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/..",
    paths: {
        "core":"core",
        "logManager": "common/LogManager",
        "util": "util",
        "storage": "storage",
        "user": "user",
        "config": 'config',
        "cli": 'cli',
        "bin": 'bin',
        "auth": 'auth',
        "coreclient": 'coreclient',
        "worker": 'worker'
    }
});
requirejs(['worker/constants','core/core','storage/serveruserstorage','util/guid','coreclient/dumpmore','logManager'],
function(CONSTANT,Core,Storage,GUID,DUMP,logManager){
    var storage = null,
        core = null,
        result = null,
        resultReady = false,
        resultRequested = false,
        resultId = null,
        error = null,
        initialized = false;

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
    var dumpMoreNodes = function(name,hash,nodePaths,callback){
        if(storage){
            if(initialized){
                storage.openProject(name,function(err,project){
                    if(err){
                        callback(err);
                    } else {
                        var core = new Core(project,{corerel:2});
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
            callback('no active data connecction');
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
            default:
                process.send({error:'unknown command'});
        }
    });

    process.send({pid:process.pid,type:CONSTANT.msgTypes.initialize});
});
