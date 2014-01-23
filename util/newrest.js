define([
    'core/core',
    'storage/serveruserstorage',
    'coreclient/tojson',
    'coreclient/dump',
    'util/url',
    'logManager'
],function(
    Core,
    Storage,
    ToJson,
    Dump,
    URL,
    logManager
    ){

    function Rest(_parameters){
        _parameters.baseUrl = _parameters.baseUrl || "http://localhost/rest";
        var _storage = new Storage({'host':_parameters.host,'port':_parameters.port,'database':_parameters.database,'log':logManager.create('REST-actor')}),
            _initialized = false,
            _opened = false,
            _requestTypes = {
                'GET':'GET',
                'POST':'POST',
                'PUT':'PUT',
                'DELETE':'DELETE'
            },
            _commands = {
                'help':'help',
                'projects':'projects',
                'branches':'branches',
                'commits':'commits',
                'commit':'commit',
                'node':'node',
                'dump':'dump',
                'etf': 'etf'
            },
            _HTTPError = {
                'badRequest':400,
                'internalServerError':500,
                'notImplemented':501,
                'serviceUnavailable':503,
                'ok':200
            };

        function printHelp(callback){
            callback(_HTTPError.ok,{
                commands:{
                    'GET':{
                        'help':{
                            'description':"Responds with a textual JSON object which describes the available REST commands.",
                            'example': _parameters.baseUrl+'/help'
                        },
                        'projects':{
                            'description':"Responds with an array of the names of the available projects.",
                            'example': _parameters.baseUrl+'/projects'
                        },
                        'branches':{
                            'description':"Responds with the branches of the given project and their commit URLs in a hash table.",
                            'example': _parameters.baseUrl+'/branches/projectName'
                        },
                        'commit':{
                            'description':"Responds with the projects asked commit object",
                            'example': _parameters.baseUrl+'/commit/projectName/commitHash'
                        },
                        'commits':{
                            'description':"Responds the URL array of the latest N commits. If no N is given then it returns the latest commit's URL in an array.",
                            'example': _parameters.baseUrl+'/commits/projectName/N'
                        },
                        'node':{
                            'description':"Responds with the JSON representation of the pointed node. All related nodes are presented with JSON reference objects.",
                            'example': _parameters.baseUrl+'/node/projectName/rootHash/pathOfNode'
                        },
                        'dump':{
                            'description':"Responds with the JSON representation of the pointed node. All sub-nodes are extracted and outer relations of the sub-tree represented by JSON reference objects.",
                            'example': _parameters.baseUrl+'/dump/projectName/rootHash/pathOfNode'
                        },
                        'etf':{
                            'description':"Responds with the JSON representation of the pointed node. All sub-nodes are extracted and outer relations of the sub-tree represented by JSON reference objects. It forces file download.",
                            'example': _parameters.baseUrl+'/etf/projectName/rootHash/pathOfNode/outputFileName'
                        }
                    }
                }
            });
        }
        function listAvailableProjects(callback){
            _storage.getProjectNames(function(err,names){
                if(err){
                    callback(_HTTPError.internalServerError,err);
                } else {
                    callback(_HTTPError.ok,names);
                }
            });
        }
        function listAvailableBranches(projectName,callback){
            _storage.openProject(projectName,function(err,project){
                if(err){
                    callback(_HTTPError.internalServerError,err);
                } else {
                    project.getBranchNames(function(err,names){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            for(var i in names){
                                names[i] = URL.urlToRefObject(_parameters.baseUrl+'/commit/'+projectName+'/'+URL.addSpecialChars(names[i]));
                            }
                            callback(_HTTPError.ok,names);
                        }
                    });
                }
            });
        }
        function printCommit(projectName,commitHash,callback){
            _storage.openProject(projectName,function(err,project){
                if(err){
                    callback(_HTTPError.internalServerError,err);
                } else {
                    project.loadObject(commitHash,function(err,commit){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            var myCommit = {};
                            myCommit.self = URL.urlToRefObject(_parameters.baseUrl+'/commit/'+projectName+'/'+URL.addSpecialChars(commitHash));
                            myCommit.root = URL.urlToRefObject(_parameters.baseUrl+'/node/'+projectName+'/'+URL.addSpecialChars(commit.root));
                            myCommit.parents = [];
                            for(var i=0;i<commit.parents.length;i++){
                                myCommit.parents.push(URL.urlToRefObject(_parameters.baseUrl+'/commit/'+projectName+'/'+URL.addSpecialChars(commit.parents[i])));
                            }
                            myCommit.message = commit.message;

                            callback(_HTTPError.ok,myCommit);
                        }
                    });
                }
            });
        }
        function listCommits(projectName,latestNCommit,callback){
            _storage.openProject(projectName,function(err,project){
                if(err){
                    callback(_HTTPError.internalServerError,err);
                } else {
                    project.getCommits((new Date()).getTime(),latestNCommit,function(err,commits){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            for(var i=0;i<commits.length;i++){
                                commits[i] = URL.urlToRefObject(_parameters.baseUrl+'/commit/'+projectName+'/'+URL.addSpecialChars(commits[i]['_id']));
                            }
                            callback(_HTTPError.ok,commits);
                        }
                    });
                }
            });
        }
        function printNode(projectName,rootHash,path,callback){
            _storage.openProject(projectName,function(err,project){
                if(err){
                    callback(_HTTPError.internalServerError,err);
                } else {
                    var core = new Core(project);
                    core.loadRoot(rootHash,function(err,root){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            core.loadByPath(root,path,function(err,node){
                                if(err){
                                    callback(_HTTPError.internalServerError,err);
                                } else {
                                    ToJson(core,node,_parameters.baseUrl+'/node/'+projectName+'/'+URL.addSpecialChars(rootHash),'url',function(err,jNode){
                                        if(err){
                                            callback(_HTTPError.internalServerError,err);
                                        } else {
                                            callback(_HTTPError.ok,jNode);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
        function dumpNode(projectName,rootHash,path,callback){
            _storage.openProject(projectName,function(err,project){
                if(err){
                    callback(_HTTPError.internalServerError,err);
                } else {
                    var core = new Core(project);
                    core.loadRoot(rootHash,function(err,root){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            core.loadByPath(root,path,function(err,node){
                                if(err){
                                    callback(_HTTPError.internalServerError,err);
                                } else {
                                    Dump(core,node,_parameters.baseUrl+'/dump/'+projectName+'/'+URL.addSpecialChars(rootHash),'guid',function(err,dump){
                                        if(err){
                                            callback(_HTTPError.internalServerError,err);
                                        } else {
                                            callback(_HTTPError.ok,dump);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
        function doGET(command,parameters,callback){
            switch(command){
                case _commands.help:
                    printHelp(callback);
                    break;
                case _commands.projects:
                    listAvailableProjects(callback);
                    break;
                case _commands.branches:
                    listAvailableBranches(parameters[0],callback);
                    break;
                case _commands.commits:
                    listCommits(parameters[0],Number(parameters[1]) === 'NaN' ? 1 : Number(parameters[1]),callback);
                    break;
                case _commands.commit:
                    printCommit(parameters[0],URL.removeSpecialChars(parameters[1] || ""),callback);
                    break;
                case _commands.node:
                    printNode(parameters[0],URL.removeSpecialChars(parameters[1] || ""),URL.removeSpecialChars(parameters[2] || ""),callback);
                    break;
                case _commands.dump:
                case _commands.etf:
                    dumpNode(parameters[0],URL.removeSpecialChars(parameters[1] || ""),URL.removeSpecialChars(parameters[2] || ""),callback);
                    break;
                default:
                    printHelp(callback);
            }
        }
        function doPOST(command,parameters,callback){
            callback(_HTTPError.notImplemented);
        }
        function doPUT(command,parameters,callback){
            callback(_HTTPError.notImplemented);
        }
        function doDELETE(command,parameters,callback){
            callback(_HTTPError.notImplemented);
        }
        function doRESTCommand(requestType,command,parameters,callback){
            if(_opened){
                switch(requestType){
                    case _requestTypes.GET:
                        doGET(command,parameters,callback);
                        break;
                    case _requestTypes.POST:
                        doPOST(command,parameters,callback);
                        break;
                    case _requestTypes.PUT:
                        doPUT(command,parameters,callback);
                        break;
                    case _requestTypes.DELETE:
                        doDELETE(command,parameters,callback);
                        break;
                    default:
                        // TODO now we are helping thenm a bit :) callback(_HTTPError.badRequest);
                        doGET(_commands.help,null,callback);
                }

            } else {
                callback(_HTTPError.serviceUnavailable,{'msg':'REST actor not yet connected to the database!'});
            }
        }
        function initialize(callback){
            if(_initialized === false){
                _initialized = true;
                _storage.openDatabase(function(err){
                    if(err){
                        _initialized = false;
                    } else {
                        _opened = true;
                    }
                    callback(err);
                });
            } else {
                callback(null);
            }
        }

        return {
            initialize: initialize,
            doRESTCommand: doRESTCommand,
            request: _requestTypes,
            command: _commands
        };

    }

    return Rest;
});
