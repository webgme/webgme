/*globals define*/
define([
    'common/core/core',
    'common/storage/serveruserstorage',
    'common/core/users/tojson',
    'common/core/users/dump',
    'common/util/url',
    'common/core/users/serialization'
],function(
    Core,
    Storage,
    ToJson,
    Dump,
    URL,
    Serialization
    ){
    var Logger = require(require('path').join(requirejs.s.contexts._.config.baseUrl, 'server/logger'));

    function Rest(_parameters){
        var gmeConfig = _parameters.globConf;
        _parameters.baseUrl = _parameters.baseUrl || "http://localhost/rest"; // FIXME: This should come from config
        _parameters.authorization = /*_parameters.authorization || */function(token,projectname,callback){callback(null,true);}; //TODO temporary removal of second authorization check
        var _storage = new Storage({'globConf': gmeConfig, 'log': Logger.create('gme:common:util:newrest:storage', gmeConfig.server.log)}),
            _baseUrl = _parameters.baseUrl,
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
                'forbidden':403,
                'notFound': 404,
                'internalServerError':500,
                'notImplemented':501,
                'serviceUnavailable':503,
                'ok':200
            };

        function printHelp(callback){
            // TODO: add blob usage documentation here...
            callback(_HTTPError.ok,{
                commands:{
                    'GET':{
                        'help':{
                            'description':"Responds with a textual JSON object which describes the available REST commands.",
                            'example': _baseUrl+'/help'
                        },
                        'projects':{
                            'description':"Responds with an array of the names of the available projects.",
                            'example': _baseUrl+'/projects'
                        },
                        'branches':{
                            'description':"Responds with the branches of the given project and their commit URLs in a hash table.",
                            'example': _baseUrl+'/branches?project=projectName'
                        },
                        'commit':{
                            'description':"Responds with the projects asked commit object",
                            'example': _baseUrl+'/commit?project=projectName&commit=commitHash'
                        },
                        'commits':{
                            'description':"Responds the URL array of the latest N commits. If no N is given then it returns the latest commit's URL in an array.",
                            'example': _baseUrl+'/commits?project=projectName&number=N'
                        },
                        'node':{
                            'description':"Responds with the JSON representation of the pointed node. All related nodes are presented with JSON reference objects.",
                            'example': _baseUrl+'/node?project=projectName&root=rootHash&path=pathOfNode'
                        },
                        'dump':{
                            'description':"Responds with the JSON representation of the pointed node. All sub-nodes are extracted and outer relations of the sub-tree represented by JSON reference objects.",
                            'example': _baseUrl+'/dump?project=projectName&root=rootHash&path=pathOfNode'
                        },
                        'etf':{
                            'description':"Responds with the JSON representation of the pointed node. All sub-nodes are extracted and outer relations of the sub-tree represented by JSON reference objects. It forces file download.",
                            'example': _baseUrl+'/etf?project=projectName&root=rootHash&path=pathOfNode&output=outputFileName'
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
                                names[i] = URL.urlToRefObject(_baseUrl+'/commit?project='+projectName+'&commit='+URL.addSpecialChars(names[i]));
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
                            myCommit.self = URL.urlToRefObject(_baseUrl+'/commit?ptoject='+projectName+'&commit='+URL.addSpecialChars(commitHash));
                            myCommit.root = URL.urlToRefObject(_baseUrl+'/node?project='+projectName+'&root='+URL.addSpecialChars(commit.root));
                            myCommit.parents = [];
                            for(var i=0;i<commit.parents.length;i++){
                                myCommit.parents.push(URL.urlToRefObject(_baseUrl+'/commit?project='+projectName+'&commit='+URL.addSpecialChars(commit.parents[i])));
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
                                commits[i] = URL.urlToRefObject(_baseUrl+'/commit?project='+projectName+'&commit='+URL.addSpecialChars(commits[i]['_id']));
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
                    var core = new Core(project, {globConf: gmeConfig});
                    core.loadRoot(rootHash,function(err,root){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            core.loadByPath(root,path,function(err,node){
                                if(err){
                                    callback(_HTTPError.internalServerError,err);
                                } else {
                                    ToJson(core,node,_baseUrl+'/node?project='+projectName+'&root='+URL.addSpecialChars(rootHash),'url',function(err,jNode){
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
                    var core = new Core(project, {globConf: gmeConfig});
                    core.loadRoot(rootHash,function(err,root){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            core.loadByPath(root,path,function(err,node){
                                if(err){
                                    callback(_HTTPError.internalServerError,err);
                                } else {
                                    Dump(core,node,_baseUrl+'/dump/'+projectName+'/'+URL.addSpecialChars(rootHash),'guid',function(err,dump){
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

        function exportProject(name,rootHash,branch,commitHash,callback){

            var core = null,
                project = null,
                needRootHash = function(cHash){
                    project.loadObject(cHash,function(err,commit){
                        if(err){
                            return callback(_HTTPError.internalServerError,err);
                        }
                        if(!commit) {
                            return callback(_HTTPError.notFound,new Error('no such commit ' + cHash));
                        }

                        rootHash = commit.root;
                        initialized();
                    });
                },
                initialized = function(){
                core.loadRoot(rootHash,function(err,root){
                    if(err){
                        return callback(_HTTPError.internalServerError,err);
                    }
                    Serialization.export(core,root,function(err,dump){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            callback(_HTTPError.ok,dump);
                        }
                    });
                });
            };
            _storage.getProjectNames(function(err,names){
                if(err){
                    return callback(_HTTPError.internalServerError,err);
                }

                names = names || [];
                if(names.indexOf(name) === -1){
                    return callback(_HTTPError.notFound,"unknown project " + name);
                }

                _storage.openProject(name,function(err,pr){
                    if(err){
                        return callback(_HTTPError.internalServerError,err);
                    }

                    project = pr;
                    core = new Core(project, {globConf: gmeConfig});

                    if(rootHash){
                        initialized();
                    } else if(branch){
                        project.getBranchHash(branch,"#hack",function(err,cHash){
                            if(err){
                                return callback(_HTTPError.internalServerError,err);
                            }
                            needRootHash(cHash);
                        });
                    } else {
                        needRootHash(commitHash);
                    }
                });

            });
        }

        function doGET(command,token,parameters,callback){
            switch(command){
                case _commands.help:
                    printHelp(callback);
                    break;
                case _commands.projects:
                    listAvailableProjects(callback);
                    break;
                case _commands.branches:
                    _parameters.authorization(token,parameters.project,function(err,canGo){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            if(canGo === true){
                                listAvailableBranches(parameters.project,callback);
                            } else {
                                callback(_HTTPError.forbidden);
                            }
                        }
                    });
                    break;
                case _commands.commits:
                    _parameters.authorization(token,parameters.project,function(err,canGo){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            if(canGo === true){
                                listCommits(parameters.project,Number(parameters.number) === 'NaN' ? 1 : Number(parameters.number),callback);
                            } else {
                                callback(_HTTPError.forbidden);
                            }
                        }
                    });
                    break;
                case _commands.commit:
                    _parameters.authorization(token,parameters.project,function(err,canGo){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            if(canGo === true){
                                printCommit(parameters.project,parameters.commit,callback);
                            } else {
                                callback(_HTTPError.forbidden);
                            }
                        }
                    });
                    break;
                case _commands.node:
                    _parameters.authorization(token,parameters.project,function(err,canGo){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            if(canGo === true){
                                printNode(parameters.project,parameters.root,parameters.path || "",callback);
                            } else {
                                callback(_HTTPError.forbidden);
                            }
                        }
                    });
                    break;
                case _commands.dump:
                    _parameters.authorization(token,parameters.project,function(err,canGo){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            if(canGo === true){
                                dumpNode(parameters.project,parameters.root,parameters.path || "",callback);
                            } else {
                                callback(_HTTPError.forbidden);
                            }
                        }
                    });
                    break;
                case _commands.etf:
                    _parameters.authorization(token,parameters.project,function(err,canGo){
                        if(err){
                            callback(_HTTPError.internalServerError,err);
                        } else {
                            if(canGo === true){
                                exportProject(parameters.project,parameters.root,parameters.branch,parameters.commit,callback);
                            } else {
                                callback(_HTTPError.forbidden);
                            }
                        }
                    });
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
        function doRESTCommand(requestType,command,token,parameters,callback){
            if(_opened){
                if(_parameters.baseUrl.indexOf('/rest/token') !== -1){
                    _baseUrl = _parameters.baseUrl.replace('/rest/token','/rest/'+token);
                } else {
                    _baseUrl = _parameters.baseUrl;
                }
                switch(requestType){
                    case _requestTypes.GET:
                        doGET(command,token,parameters,callback);
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

        function setBaseUrl(newUrl){
            _parameters.baseUrl = newUrl;
            _baseUrl = newUrl;
        }
        return {
            initialize: initialize,
            doRESTCommand: doRESTCommand,
            request: _requestTypes,
            command: _commands,
            setBaseUrl : setBaseUrl
        };

    }

    return Rest;
});
