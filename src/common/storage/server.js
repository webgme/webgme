/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid","util/url","socket.io","worker/serverworkermanager","cookie-parser" ], function(ASSERT,GUID,URL,IO,SWM,COOKIE){

    var server = function(_database,options){
        ASSERT(typeof _database === 'object');
        options = options || {};
        options.port = options.port || 80;
        options.secret = options.secret || 'this is WEBGME!!!';
        options.cookieID = options.cookieID || 'webgme';
        options.authentication = options.authentication;
        options.authorization = options.authorization || function(sessionID,projectName,type,callback){callback(null,true);};
        options.auth_deleteProject = options.auth_deleteProject || function() {};
        options.sessioncheck = options.sessioncheck || function(sessionID,callback){callback(null,true);};
        options.getAuthorizationInfo = options.getAuthorizationInfo || function(sessionID,projectName,callback){callback(null,{'read':true,'write':true,'delete':true});};
        options.webServerPort = options.webServerPort || 80;
        options.log = options.log || {
            debug: function (msg) {
                console.log("DEBUG - " + msg);
            },
            error: function (msg) {
                console.log("ERROR - " + msg);
            }
        };
        var _socket = null,
            _objects = {},
            _projects = {},
        /*_references = {},*/
            _databaseOpenCallbacks = [],
            _databaseOpened = false,
            ERROR_DEAD_GUID = 'the given object does not exists',
            _workerManager = null,
            _connectedWorkers = {},
            _eventHistory = [],
            _events = {},
            _waitingEventCallbacks = [],
            SERVER_EVENT = {
                PROJECT_CREATED : "PROJECT_CREATED",
                PROJECT_DELETED : "PROJECT_DELETED",
                PROJECT_UPDATED : "PROJECT_UPDATED",
                BRANCH_CREATED : "BRANCH_CREATED",
                BRANCH_DELETED : "BRANCH_DELETED",
                BRANCH_UPDATED : "BRANCH_UPDATED"
            };

        function getSessionID(handshakeData){
            if(handshakeData && handshakeData.query && handshakeData.query.webGMESessionId && handshakeData.query.webGMESessionId !== 'undefined'){
                return handshakeData.query.webGMESessionId;
            }

            if(handshakeData && handshakeData.query && handshakeData.query[options.cookieID] && handshakeData.query[options.cookieID] !== 'undefined'){
                return COOKIE.signedCookie(handshakeData.query[options.cookieID],options.secret);
            }

            //we try to dig it from the signed cookie
            if(options.cookieID && options.secret && handshakeData && handshakeData.headers && handshakeData.headers.cookie) {
                return COOKIE.signedCookie(URL.parseCookie(handshakeData.headers.cookie)[options.cookieID],options.secret);
            }
            return undefined;
        }

        function checkDatabase(callback){
            if(_databaseOpened){
                callback();
            } else {
                if (_databaseOpenCallbacks.length === 0) {
                    _databaseOpenCallbacks = [callback];
                    _database.openDatabase(function (err) {
                        if (err) {
                            _databaseOpened = false;
                            //this error has to be put to console as well
                            console.log('Error in mongoDB connection initiation!!! - ', err);
                            options.log.error(err);
                            while (_databaseOpenCallbacks.length) {
                                _databaseOpenCallbacks.pop()(err);
                            }
                        } else {
                            _databaseOpened = true;
                            while (_databaseOpenCallbacks.length) {
                                _databaseOpenCallbacks.pop()(null);
                            }
                        }
                    });
                } else {
                    _databaseOpenCallbacks.push(callback);
                }
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

        function fireEvent(parameters){
            var guid = GUID(),
                callbacks = _waitingEventCallbacks,
                i;
            _waitingEventCallbacks = [];
            _events[guid] = parameters;
            _eventHistory.unshift(guid);
            if(_eventHistory.length > 1000){
                delete _events[_eventHistory.pop()];
            }

            for(i=0;i<callbacks.length;i++){
                callbacks[i](null,guid,parameters);
            }
        }
        function eventRequest(latestGuid,callback){
            var index;

            index = _eventHistory.indexOf(latestGuid);
            if(index === -1 || index === 0){
                //new user or already received the last event
                _waitingEventCallbacks.push(callback);
            } else {
                //missed some events so we send the next right away
                callback(null,_eventHistory[index-1],_events[_eventHistory[index-1]]);
            }
        }

        function open(){
            _socket = IO.listen(options.combined ? options.combined : options.port,{
                'transports': [
                    'websocket'
                ]
            });

            _socket.use(function(socket, next) {
                var handshakeData = socket.handshake;
                //either the html header contains some webgme signed cookie with the sessionID
                // or the data has a webGMESession member which should also contain the sessionID - currently the same as the cookie
                if (options.session === true){
                    var sessionID;
                    /*if(data.webGMESessionId === undefined){
                        if(data.query && data.query.webGMESessionId && data.query.webGMESessionId !== 'undefined'){
                            sessionID = data.query.webGMESessionId;
                        }
                    }
                    if(sessionID === null || sessionID === undefined){
                        if(data.headers.cookie){
                            var cookie = URL.parseCookie(data.headers.cookie);
                            if(cookie[options.cookieID] !== undefined || cookie[options.cookieID] !== null){
                                sessionID = require('connect').utils.parseSignedCookie(cookie[options.cookieID],options.secret);
                                data.query = data.query || {};
                                data.query.webGMESessionId = sessionID;
                                data.webGMESessionId = sessionID;
                            }
                        } else {
                            console.log('DEBUG COOKIE INFO', JSON.stringify(data.headers));
                            console.log('DEBUG HANDSHAKE INFO', JSON.stringify(data.query));
                            return accept(null,false);
                        }
                    }*/
                    sessionID = getSessionID(handshakeData);
                    options.sessioncheck(sessionID,function(err,isOk){
                        if(!err && isOk === true){
                            return next();
                        } else {
                            return next(err || 'error');
                        }
                    });
                } else {
                    next();
                }
            });

            //TODO check if this really helps
            _socket.on('error',function(err){
                console.log("Error have been raised on global socket.io level!!! - ",err);
                options.logger.error('error raised by socket server: ' + err);
            });

            // try to connect to mongodb immediately when the server starts (faster than waiting for a user connection)
            checkDatabase(function (err) {
                if (err) {
                    console.error("Error: could not connect to mongo: " + err);
                    options.logger.error("Error: could not connect to mongo: " + err);
                }
            });

            _socket.on('connection',function(socket){
                //first we connect our socket id to the session

                socket.on('error',function(err){
                    console.log("Error have been raised on socket.io level!!! - ",err);
                    options.logger.error('error raised by socket: ' + err);
                });

                if (process.env['LOG_WEBGME_TIMING']) {
                    var oldon = socket.on;
                    socket.on = function (msg, cb) {
                        oldon.apply(socket, [msg, function () {
                            var logmsg = socket.id + " " + msg;
                            var args = [];
                            for (var i = 0; i < arguments.length; i++) {
                                args[i] = arguments[i];
                            }
                            if (msg === 'insertObjects') {
                                logmsg = logmsg + ' ' + Object.keys(args[1]).length;
                            }
                            if (msg === 'setBranchHash') {
                                logmsg = logmsg + ' ' + args[1] + ': ' + args[2] + ' -> ' + args[3];
                            }
                            if (msg === 'getBranchHash') {
                                logmsg = logmsg + ' ' + args[1] + ': ' + args[2];
                            }
                            var time1 = process.hrtime();
                            var callback2 = args[args.length - 1];
                            args[args.length - 1] = function () {
                                var time2 = process.hrtime(time1);
                                if (msg === 'getBranchHash') {
                                    logmsg = logmsg + ' ' + arguments[1];
                                }
                                console.log(logmsg + " " + ((time2[0] * 1000) + (time2[1] / 1000 / 1000 | 0)));
                                callback2.apply(this, arguments);
                            };
                            cb.apply(this, args);
                        }]);
                    };
                }
                socket.on('openDatabase', function(callback){
                    checkDatabase(callback);
                });

                socket.on('closeDatabase', function(callback){
                    //we ignore the close request from any client
                    //TODO check how we should function
                    /*
                     _databaseOpened = false;
                     _database.closeDatabase(callback);
                     */
                    if(typeof callback === 'function'){
                        callback(null);
                    }
                });

                socket.on('fsyncDatabase', function (projectName, callback){
                    if (typeof projectName === 'function') {
                        // old API
                        callback = projectName;
                        projectName = undefined;
                    }
                    checkDatabase(function(err){
                        if(err){
                            callback(err);
                        } else {
                            if (projectName) {
                                checkProject(getSessionID(socket.handshake), projectName, function (err, project) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        project.fsyncDatabase(callback);
                                    }
                                });
                            } else {
                                // old API
                                _database.fsyncDatabase(callback);
                            }
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
                                        options.getAuthorizationInfo(getSessionID(socket.handshake),name,function(err,authObj){
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
                            options.getAuthorizationInfo(getSessionID(socket.handshake),name,callback);
                        }
                    });
                });

                socket.on('deleteProject', function(projectName,callback){
                    options.authorization(getSessionID(socket.handshake),projectName,'delete',function(err,cando){
                        if(err || !cando){
                            callback(err);
                        } else {
                            _database.deleteProject(projectName,function(err){
                                if(err){
                                    callback(err);
                                } else {
                                    options.auth_deleteProject(projectName);
                                    //TODO what to do with the object itself???
                                    fireEvent({type:SERVER_EVENT.PROJECT_DELETED,project:projectName});
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
                                    createProject(getSessionID(socket.handshake),projectName,function(err,project){
                                        if(!err){
                                            fireEvent({type:SERVER_EVENT.PROJECT_CREATED,project:projectName});
                                        }
                                        callback(err,project);
                                    });

                                } else {
                                    checkProject(getSessionID(socket.handshake),projectName,callback);
                                }
                            });
                        }
                    });
                });

                socket.on('closeProject', function(projectName,callback){
                    callback = callback || function() {};
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
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
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.loadObject(hash,callback);
                        }
                    });
                });
                socket.on('loadObjects', function(projectName,hashes,callback){
                    var error = null,
                        needed = hashes.length,
                        objects = {},
                        project, i,
                        loadObject = function(hash,next){
                            project.loadObject(hash,function(err,obj){
                                var object = {};
                                object.hash = hash;
                                object.result = obj;
                                next(err,object);
                            });
                        },
                        innerCb = function(err,object){
                            error = error || err;
                            objects[object.hash]=object.result;
                            if(--needed === 0){
                                callback(error,objects);
                            }
                        };

                    checkProject(getSessionID(socket.handshake),projectName,function(err,p){
                        if(err){
                            callback(err);
                        } else {
                            project = p;
                            if(needed > 0){
                                for(i=0;i<hashes.length;i++){
                                    loadObject(hashes[i],innerCb);
                                }
                            } else {
                                callback('no object was requested');
                            }
                        }
                    });
                });

                socket.on('insertObject', function(projectName,object,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            options.authorization(getSessionID(socket.handshake),projectName,'write',function(err,cando){
                                if(!err && cando === true){
                                    project.insertObject(object,callback);
                                } else {
                                    callback(err);
                                }
                            });
                        }
                    });
                });
                socket.on('insertObjects', function(projectName,objects,callback){
                    var error = null,
                        keys = Object.keys(objects),
                        needed = keys.length,
                        project, i,
                        insertObject = function(object,next){
                            project.insertObject(object,next);
                        },
                        innerCb = function(err){
                            error = error || err;
                            if(--needed === 0){
                                callback(error);
                            }
                        };

                    checkProject(getSessionID(socket.handshake),projectName,function(err,p){
                        if(err){
                            callback(err);
                        } else {
                            project = p;
                            options.authorization(getSessionID(socket.handshake),projectName,'write',function(err,cando){
                                if(!err && cando === true){
                                    if(needed > 0){
                                        for(i=0;i<keys.length;i++){
                                            insertObject(objects[keys[i]],innerCb);
                                        }
                                    } else {
                                        callback('no object to save');
                                    }

                                } else {
                                    callback(err);
                                }
                            });

                        }
                    });
                });

                socket.on('getInfo', function(projectName,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.getInfo(callback);
                        }
                    });
                });
                socket.on('setInfo', function(projectName,info,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            options.authorization(getSessionID(socket.handshake),projectName,'write',function(err,cando) {
                                if(!err && cando === true){
                                    project.setInfo(info, callback);
                                } else {
                                    callback(err || "insufficient authorization for operation");
                                }
                            });
                        }
                    });
                });

                socket.on('findHash', function(projectName,beginning,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.findHash(beginning,callback);
                        }
                    });
                });

                socket.on('dumpObjects', function(projectName,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.dumpObjects(callback);
                        }
                    });
                });
                socket.on('getBranchNames', function(projectName,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.getBranchNames(callback);
                        }
                    });
                });
                socket.on('getBranchHash', function(projectName,branch,oldhash,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.getBranchHash(branch,oldhash,callback);
                        }
                    });
                });
                socket.on('setBranchHash', function(projectName,branch,oldhash,newhash,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            options.authorization(getSessionID(socket.handshake),projectName,'write',function(err,cando){
                                if(!err && cando === true){
                                    project.setBranchHash(branch,oldhash,newhash,function(err){
                                        if(!err){
                                            //here comes the branch eventing
                                            if(oldhash === '' && newhash !== ''){
                                                fireEvent({type:SERVER_EVENT.BRANCH_CREATED,project:projectName,branch:branch,commit:newhash});
                                            } else if(oldhash !== '' && newhash === ''){
                                                fireEvent({type:SERVER_EVENT.BRANCH_DELETED,project:projectName,branch:branch});
                                            } else if(oldhash !== '' && newhash !== ''){
                                                fireEvent({type:SERVER_EVENT.BRANCH_UPDATED,project:projectName,branch:branch,commit:newhash});
                                            }
                                        }
                                        callback(err);
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        }
                    });
                });
                socket.on('getCommits',function(projectName,before,number,callback){
                    checkProject(getSessionID(socket.handshake),projectName,function(err,project){
                        if(err){
                            callback(err);
                        } else {
                            project.getCommits(before,number,callback);
                        }
                    });
                });


                //worker commands
                socket.on('simpleRequest',function(parameters,callback) {
                    var request = function() {
                        _workerManager.request(parameters, function (err, id) {
                            if (!err && id) {
                                registerConnectedWorker(socket.id, id);
                            }
                            callback(err, id);
                        });
                    };

                    parameters.webGMESessionId = getSessionID(socket.handshake) || null;
                    if (!options.authentication) {
                        request();
                    } else {
                        options.sessionToUser(parameters.webGMESessionId, function (err, userId) {
                            if (err || !userId) {
                                return callback(err || 'unauthorized');
                            }
                            parameters.userId = userId;
                            request();
                        });
                    }
                });

                socket.on('simpleResult',function(resultId,callback){
                    deregisterConnectedWorker(socket.id,resultId);
                    getWorkerResult(resultId,callback);
                });

                socket.on('simpleQuery',function(workerId,parameters,callback){
                    _workerManager.query(workerId,parameters,callback);
                });

                //eventing
                socket.on('getNextServerEvent',function(guid,callback){
                    eventRequest(guid,callback);
                });

                //token for REST
                socket.on('getToken',function(callback){
                    options.getToken(getSessionID(socket.handshake),callback);
                });

                socket.on('disconnect',function(){
                    //TODO temporary the disconnect function has been removed
                    stopConnectedWorkers(socket.id);
                });
            });

            _workerManager = new SWM({
                basedir:options.basedir,
                mongoip:options.host,
                mongoport:options.port,
                mongodb:options.database,
                intoutdir:options.intoutdir,
                pluginBasePaths:options.pluginBasePaths,
                serverPort:options.webServerPort,
                sessionToUser:options.sessionToUser,
                auth:options.auth,
                globConf:options.globConf
            });
        }

        function close(){

            //disconnect clients
            if(_socket){
                //_socket.sockets.emit('disconnect');
                _socket.sockets.sockets.forEach(function (socket){
                    socket.disconnect();
                });
                _socket = null;
            }

            var cleanup = function () {
                _objects = {};
                _projects = {};
                //_references = {};
                _databaseOpened = false;
            };
            if (_databaseOpened || _databaseOpenCallbacks.length) {
                checkDatabase(function (err) {
                    //close projects
                    for (var i in _projects) {
                        _projects[i].closeProject(null);
                    }

                    //close database
                    _database.closeDatabase(null);
                    cleanup();
                });
            } else {
                cleanup();
            }
        }

        function getWorkerResult(resultId,callback){
            _workerManager.result(resultId,callback);
        }

        //connected worker handlings for cleanup
        function registerConnectedWorker(socketId,workerId){
            var index;
            _connectedWorkers[socketId] = _connectedWorkers[socketId] || [];
            index = _connectedWorkers[socketId].indexOf(workerId);
            if(index === -1){
                _connectedWorkers[socketId].push(workerId);
            }
        }
        function deregisterConnectedWorker(socketId,workerId){
            var index;
            _connectedWorkers[socketId] = _connectedWorkers[socketId] || [];
            index = _connectedWorkers[socketId].indexOf(workerId);
            if(index !== -1){
                _connectedWorkers[socketId].splice(index,1);
            }
        }
        function stopConnectedWorkers(socketId){
            var i;
            if(_workerManager){
                var stop = function (worker) {
                    _workerManager.result(_connectedWorkers[socketId][i], function (err) {
                        if (err) {
                            options.log.error("unable to stop connected worker [" + worker + "] of socket " + socketId);
                        }
                    });
                };
                _connectedWorkers[socketId] = _connectedWorkers[socketId] || [];
                for(i=0;i<_connectedWorkers[socketId].length;i++){
                    //TODO probably we would need some kind of result handling
                    stop(_connectedWorkers[socketId][i]);
                }
                delete _connectedWorkers[socketId];
            }
        }

        return {
            open: open,
            close: close,
            getWorkerResult: getWorkerResult
        };
    };

    return server;
});
/**
 * Created by tkecskes on 5/10/2014.
 */
