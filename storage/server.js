/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid","util/url","socket.io","worker/serverworkermanager" ], function(ASSERT,GUID,URL,IO,SWM){

    var server = function(_database,options){
        ASSERT(typeof _database === 'object');
        options = options || {};
        options.port = options.port || 80;
        options.secret = options.secret || 'this is WEBGME!!!';
        options.cookieID = options.cookieID || 'webgme';
        options.authorization = options.authorization || function(sessionID,projectName,type,callback){callback(null,true);};
        options.sessioncheck = options.sessioncheck || function(sessionID,callback){callback(null,true);};
        options.authInfo = options.authInfo || function(sessionID,projectName,callback){callback(null,{'read':true,'write':true,'delete':true});};
        var _socket = null,
            _objects = {},
            _projects = {},
            /*_references = {},*/
            _databaseOpened = false,
            ERROR_DEAD_GUID = 'the given object does not exists',
            _workerManager = null;

        function getSessionID(socket){
            return socket.handshake.webGMESession;
        }

        function checkDatabase(callback){
            if(_databaseOpened){
                callback();
            } else {
                _databaseOpened = true;
                _database.openDatabase(function(err){
                    if(err){
                        _databaseOpened = false;
                        callback(err);
                    } else {
                        callback(null);
                    }
                });
            }
        }

        function checkProject(client,projectName,callback){
            options.authorization(client,projectName,'read',function(err,cando){
                if(!err && cando === true){
                    _database.openProject(projectName,callback);
                } else {
                    err = err || 'missing necessary user rights';
                    callback(err);
                }
            });
        }

        function createProject(client,project,callback){
            options.authorization(client,project,'create',function(err,cando){
                if(!err && cando === true){
                    if(_projects[project]){
                        //TODO we should find the real reason behind collection loose
                        try{
                            _projects[project].getBranchNames(function(err,names){
                                if(err){
                                    delete _projects[project];
                                    checkProject(client,project,callback);
                                } else {
                                    callback(null,_projects[project]);
                                }
                            });
                        }
                        catch(e){
                            delete _projects[project];
                            checkProject(client,project,callback);
                        }
                        callback(null,_projects[project]);
                    } else {
                        _database.openProject(project,function(err,proj){
                            if(!err && proj){
                                _projects[project] = proj;
                                callback(null,_projects[project]);
                            } else {
                                callback(err,null);
                            }
                        });
                    }
                } else {
                    err = err || 'missing necessary user rights';
                    callback(err);
                }
            });
        }

        function open(){
            _socket = IO.listen(options.combined ? options.combined : options.port,{
                'transports': [
                    'websocket'
                ]
            });
            if(options.logger){
                _socket.set('logger',options.logger);
            }

            _socket.set('authorization',function(data,accept){
                //either the html header contains some webgme signed cookie with the sessionID
                // or the data has a webgme member which should also contain the sessionID - currently the same as the cookie

                if (options.session === true){
                    var sessionID = data.webgme;
                    if(sessionID === null || sessionID === undefined){
                        if(data.headers.cookie){
                            var cookie = URL.parseCookie(data.headers.cookie);
                            if(cookie[options.cookieID] !== undefined || cookie[options.cookieID] !== null){
                                sessionID = require('connect').utils.parseSignedCookie(cookie[options.cookieID],options.secret);
                            }
                        } else {
                            console.log('DEBUG COOKIE INFO', JSON.stringify(data.headers));
                            return accept(null,false);
                        }
                    }
                    options.sessioncheck(sessionID,function(err,isOk){
                        if(!err && isOk === true){
                            data.webGMESession = sessionID;
                            return accept(null,true);
                        } else {
                            return accept(err,false);
                        }
                    });
                } else {
                    return accept(null,true);
                }
            });


            _socket.on('connection',function(socket){
                //first we connect our socket id to the session

                socket.on('openDatabase', function(callback){
                    checkDatabase(callback);
                });

                socket.on('closeDatabase', function(callback){
                    _databaseOpened = false;
                    _database.closeDatabase(callback);
                });

                socket.on('fsyncDatabase', function(callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.fsyncDatabase(callback);
                        }
                    });
                });

                socket.on('getDatabaseStatus', function(oldstatus,callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getDatabaseStatus(oldstatus,callback);
                        }
                    });
                });

                socket.on('getProjectNames', function(callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getProjectNames(callback);
                        }
                    });
                });

                socket.on('getAllowedProjectNames', function(callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getProjectNames(function(err,names){
                                if(!err){
                                    var allowedNames = [];
                                    var answerNeeded = names.length;
                                    var isProjectReadable = function(name,callback){
                                        options.authInfo(getSessionID(socket),name,function(err,authObj){
                                            if(!err){
                                                if(authObj && authObj.read === true){
                                                    allowedNames.push(name);
                                                }
                                            }
                                            callback(err);
                                        });
                                    };
                                    if(answerNeeded>0){
                                        for(var i=0;i<names.length;i++){
                                            isProjectReadable(names[i],function(err){
                                                if(--answerNeeded === 0){
                                                    callback(null,allowedNames);
                                                }
                                            });
                                        }
                                    } else {
                                        callback(null,allowedNames);
                                    }
                                } else {
                                    callback(err);
                                }
                            });
                        }
                    });
                });

                socket.on('getAuthorizationInfo', function(name,callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            options.authInfo(getSessionID(socket),name,callback);
                        }
                    });
                });

                socket.on('deleteProject', function(projectName,callback){
                    options.authorization(getSessionID(socket),projectName,'delete',function(err,cando){
                        if(err || !cando){
                            callback(err);
                        } else {
                            _database.deleteProject(projectName,function(err){
                                if(err){
                                    callback(err);
                                } else {
                                    //TODO what to do with the object itself???
                                    callback(null);
                                }
                            });
                        }
                    });
                });

                socket.on('openProject', function(projectName,callback){
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            _database.getProjectNames(function(err,names){
                                if(names.indexOf(projectName) === -1){
                                    //project creation
                                    createProject(getSessionID(socket),projectName,callback);
                                } else {
                                    checkProject(getSessionID(socket),projectName,callback);
                                }
                            });
                        }
                    });
                });

                socket.on('closeProject', function(projectName,callback){
                    callback = callback || function() {};
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err) {
                            callback(err);
                        } else {
                            //TODO put this together
                            //var index = _references[projectName].indexOf(getSessionID(socket));
                            //_references[projectName].splice(index,1);
                            //if(_references[projectName].length === 0){
                                //delete _references[projectName];
                                //delete _projects[projectName];
                                //project.closeProject(callback);
                            //} else {
                                callback(null);
                           // }
                        }
                    });
                });

                socket.on('loadObject', function(projectName,hash,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.loadObject(hash,callback);
                        }
                    });
                });

                socket.on('insertObject', function(projectName,object,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            options.authorization(getSessionID(socket),projectName,'write',function(err,cando){
                               if(!err && cando === true){
                                   project.insertObject(object,callback);
                               } else {
                                   callback(err);
                               }
                            });
                        }
                    });
                });

                socket.on('findHash', function(projectName,beginning,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.findHash(beginning,callback);
                        }
                    });
                });

                socket.on('dumpObjects', function(projectName,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.dumpObjects(callback);
                        }
                    });
                });
                socket.on('getBranchNames', function(projectName,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.getBranchNames(callback);
                        }
                    });
                });
                socket.on('getBranchHash', function(projectName,branch,oldhash,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.getBranchHash(branch,oldhash,callback);
                        }
                    });
                });
                socket.on('setBranchHash', function(projectName,branch,oldhash,newhash,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            options.authorization(getSessionID(socket),projectName,'write',function(err,cando){
                                if(!err && cando === true){
                                    project.setBranchHash(branch,oldhash,newhash,callback);
                                } else {
                                    callback(err);
                                }
                            });
                        }
                    });
                });
                socket.on('getCommits',function(projectName,before,number,callback){
                    checkProject(getSessionID(socket),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.getCommits(before,number,callback);
                        }
                    });
                });


                //worker commands
                socket.on('simpleRequest',function(parameters,callback){
                    _workerManager.request(parameters,callback);
                });

                socket.on('simpleResult',function(resultId,callback){
                    getWorkerResult(resultId,callback);
                });

                //token for REST
                socket.on('getToken',function(callback){
                    options.getToken(getSessionID(socket),callback);
                });

                socket.on('disconnect',function(){
                    //TODO temporary the disconnect function has been removed
                });
            });

            _workerManager = new SWM({basedir:options.basedir,mongoip:options.host,mongoport:options.port,mongodb:options.database});
        }

        function close(){

            //disconnect clients
            if(_socket){
                //_socket.sockets.emit('disconnect');
                _socket.sockets.clients().forEach(function (socket){
                    socket.disconnect();
                });
                _socket.server.close();
                _socket = null;
            }

            if(_databaseOpened){
                //close projects
                for(var i in _projects){
                    _projects[i].closeProject(null);
                }

                //close database
                _database.closeDatabase(null);
            }

            _objects = {};
            _projects = {};
            //_references = {};
            _databaseOpened = false;
        }

        function getWorkerResult(resultId,callback){
            _workerManager.result(resultId,callback);
        }

        return {
            open: open,
            close: close,
            getWorkerResult: getWorkerResult
        };
    };

    return server;
});
