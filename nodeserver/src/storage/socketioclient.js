/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid"], function (ASSERT,GUID) {
    //"use strict";

    function Database(options){
        ASSERT(typeof options === "object");

        options.host = options.host || "http://localhost";
        options.port = options.port || 888;
        options.type = options.type || "browser";
        options.timeout = options.timeout || 10000;

        var socketConnected = false,
            socket = null,
            status = null,
            reconnect = false,
            getDbStatusCallbacks = {},
            callbacks = {},
            IO = null,
            projects = {},
            references = {},
            ERROR_DISCONNECTED = 'The socket.io is disconnected',
            ERROR_TIMEOUT = "no valid response arrived in time",
            STATUS_NETWORK_DISCONNECTED = "socket.io is disconnected";

        function clearDbCallbacks(){
            for(var i in getDbStatusCallbacks){
                var cb = getDbStatusCallbacks[i].cb;
                clearTimeout(getDbStatusCallbacks[i].to);
                delete getDbStatusCallbacks[i];
                cb(null,status);
            }
        }

        function clearCallbacks(){
            for(var i in callbacks){
                var cb = callbacks[i].cb;
                clearTimeout(callbacks[i].to);
                delete callbacks[i];
                cb(ERROR_DISCONNECTED);
            }
        }

        function callbackTimeout(guid){
            var cb = null;
            if(callbacks[guid]){
                cb = callbacks[guid].cb;
                delete callbacks[guid];
                cb(ERROR_TIMEOUT);
            } else if(getDbStatusCallbacks[guid]){
                cb = getDbStatusCallbacks[guid].cb;
                delete getDbStatusCallbacks[guid];
                cb(null,status);
            }
        }

        function registerProject(id,name){
            if(!references[name]){
                references[name] = [];
            }
            if(references[name].indexOf(id) === -1){
                references[name].push(id);
            }
        }

        function unRegisterProject(id,name){
            if(references[name]){
                var index = references[name].indexOf(id);
                if(index>-1){
                    references[name].splice(index,1);
                    if(references[name].length === 0){
                        delete references[name];
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }

        function openDatabase(callback){
            ASSERT(typeof callback === "function");

            if(socket){
                callback(null);
            } else {
                var guid = GUID(),
                    firstConnection = true;
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};

                function IOReady(){
                    socket = IO.connect(options.host+":"+options.port,{
                        'connect timeout': 100,
                        'reconnection delay': 100,
                        'force new connection': true
                    });

                    socket.on('reconnect',function(){
                        console.log("WOA!!!");
                    });
                    socket.on('connect',function(){
                        socketConnected = true;
                        if(firstConnection){
                            firstConnection = false;
                            socket.emit('openDatabase',function(err){
                                if(!err){
                                    socket.emit('getDatabaseStatus',null,function(err,newstatus){
                                        if(!err && newstatus){
                                            status = newstatus;
                                        }
                                        if(callbacks[guid]){
                                            clearTimeout(callbacks[guid].to);
                                            delete callbacks[guid];
                                            callback(err);
                                        }
                                    });
                                } else {
                                    socket.emit('disconnect');
                                    socket = null;
                                    if(callbacks[guid]){
                                        clearTimeout(callbacks[guid].to);
                                        delete callbacks[guid];
                                        callback(err);
                                    }
                                }
                            });
                        } else {
                            socket.emit('getDatabaseStatus',status,function(err,newstatus){
                                if(!err && newstatus){
                                    status = newstatus;
                                    clearDbCallbacks();
                                }
                            });
                        }
                    });

                    socket.on('disconnect',function(){
                        status = STATUS_NETWORK_DISCONNECTED;
                        socketConnected = false;
                        clearDbCallbacks();
                        clearCallbacks();
                    });
                }

                if(options.type === 'browser'){
                    require([options.host+":"+options.port+"/socket.io/socket.io.js"], function(){
                        IO = io;
                        IOReady();
                    });
                } else {
                    IO = require("socket.io-client");
                    IOReady();
                }
            }
        }

        function closeDatabase (callback) {
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('closeDatabase',function(err){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
                });
            } else {
                callback(ERROR_DISCONNECTED);
            }
        }

        function fsyncDatabase (callback) {
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('fsyncDatabase',function(err){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
                });
            } else {
                callback(ERROR_DISCONNECTED);
            }
        }

        function getDatabaseStatus (oldstatus,callback) {
            ASSERT(typeof callback === 'function');
            if(status !== oldstatus || status === STATUS_NETWORK_DISCONNECTED){
                callback(null,status);
            } else {
                var guid = GUID();
                getDbStatusCallbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('getDatabaseStatus',oldstatus,function(err,newstatus){
                    if(!err && newstatus){
                        status = newstatus;
                    }
                    if(callbacks[guid]){
                        clearTimeout(getDbStatusCallbacks[guid].to);
                        delete getDbStatusCallbacks[guid];
                        commonErrorCheck(err,function(err2,needRedo){
                            if(needRedo){
                                getDatabaseStatus(oldstatus,callback);
                            } else {
                                callback(err2,newstatus);
                            }
                        });
                    }
                });
            }
        }

        function getProjectNames (callback) {
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('getProjectNames',function(err,names){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err,names);
                });
            } else {
                callback(ERROR_DISCONNECTED);
            }
        }

        function deleteProject (project, callback) {
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('deleteProject',project,function(err){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
                });
            } else {
                callback(ERROR_DISCONNECTED);
            }
        }

        function openProject (project, callback) {
            ASSERT(typeof callback === 'function');
            var ownId = GUID();
            if(projects[project]){
                registerProject(ownId,project);
                callback(projects[project]);
            } else {
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('openProject',project,function(err){
                        if(!err){
                            registerProject(ownId,project);
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                projects[project] = {
                                    fsyncDatabase: fsyncDatabase,
                                    getDatabaseStatus: getDatabaseStatus,
                                    closeProject: closeProject,
                                    loadObject: loadObject,
                                    insertObject: insertObject,
                                    findHash: findHash,
                                    dumpObjects: dumpObjects,
                                    getBranchNames: getBranchNames,
                                    getBranchHash: getBranchHash,
                                    setBranchHash: setBranchHash
                                };
                                callback(null,projects[project]);
                            }
                        } else {
                            callback(err,null);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            //functions

            function fsyncDatabase(callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('fsyncDatabase',function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            function getDatabaseStatus(oldstatus,callback){
                ASSERT(typeof callback === 'function');
                if(status !== oldstatus){
                    callback(null,status);
                } else {
                    var guid = GUID();
                    getDbStatusCallbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    if(socketConnected){
                        socket.emit('getDatabaseStatus',oldstatus,function(err,newstatus){
                            if(getDbStatusCallbacks[guid]){
                                clearTimeout(getDbStatusCallbacks[guid].to);
                                delete getDbStatusCallbacks[guid];
                                if(!err && newstatus){
                                    status = newstatus;
                                }
                                callback(err,newstatus);
                            }
                        });
                    }
                }
            }

            function closeProject(callback){
                ASSERT(typeof callback === 'function');
                if(unRegisterProject(ownId,project)){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('closeProject',project,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(null);
                }
            }

            function loadObject(hash,callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('loadObject',project,hash,function(err,object){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err,object);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            function insertObject(object,callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('insertObject',project,object,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            function findHash(beginning,callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('findHash',project,beginning,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            function dumpObjects(callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('dumpObjects',project,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            function getBranchNames(callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('getBranchNames',project,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            function getBranchHash(branch,oldhash,callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('insertObject',project,branch,oldhash,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }

            function setBranchHash(branch,oldhash,newhash,callback){
                ASSERT(typeof callback === 'function');
                if(socketConnected){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('insertObject',project,branch,oldhash,newhash,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(ERROR_DISCONNECTED);
                }
            }
        }

        return {
            openDatabase : openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getDatabaseStatus: getDatabaseStatus,
            getProjectNames: getProjectNames,
            deleteProject: deleteProject,
            openProject: openProject
        }
    }
    return Database;
});
