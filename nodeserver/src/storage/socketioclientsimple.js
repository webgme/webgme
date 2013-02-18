/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid","socketiowrapper" ], function (ASSERT,GUID,IO) {
    "use strict";

    function openDatabase(options,callback){
        ASSERT(typeof options === "object" && typeof callback === "function");

        options.socketiohost = options.socketiohost || "http://localhost";
        options.socketioport = options.socketioport || 888;

        var dbId = null;
        var status = null;
        var getDbStatusCallbacks = {};
        var callbacks = {};
        var STATUS_NETWORK_DISCONNECTED = "socket.io network is disconnected";
        var TIMEOUT_ERROR = new Error("no valid response arrived in time");
        var myCallback = callback;
        var socket = IO.connect(options.socketiohost+":"+options.socketioport);

        var clearDbCallbacks = function(){
            for(var i in getDbStatusCallbacks){
                var cb = getDbStatusCallbacks[i].cb;
                clearTimeout(getDbStatusCallbacks[i].to);
                delete getDbStatusCallbacks[i];
                cb(null,status);
            }
        };

        var clearCallbacks = function(){
            for(var i in callbacks){
                var cb = callbacks[i].cb;
                clearTimeout(callbacks[i].to);
                delete callbacks[i];
                cb(STATUS_NETWORK_DISCONNECTED);
            }
        };

        var callbackTimeout = function(guid){
            var cb = callbacks[guid].cb || getDbStatusCallbacks[guid].cb;
            delete callbacks[guid];
            delete getDbStatusCallbacks[guid];
            cb(TIMEOUT_ERROR);
        };

        socket.on('connect',function(){
            if(myCallback){
                socket.emit('openDatabase',options,function(err,db){
                    if(!err && db){
                        dbId = db;
                        myCallback = null;
                        socket.emit('getDatabaseStatus',dbId,null,function(err,newstatus){
                            if(!err && newstatus){
                                status = newstatus;
                                callback(null,{
                                    closeDatabase: closeDatabase,
                                    fsyncDatabase: fsyncDatabase,
                                    getProjectNames: getProjectNames,
                                    openProject: openProject,
                                    deleteProject: deleteProject
                                });
                            } else {
                                callback(err,null);
                            }
                        });
                    } else {
                        socket.emit('disconnect');
                        callback(err,null);
                    }
                });
            } else {
                socket.emit('getDatabaseStatus',dbId,status,function(err,newstatus){
                    if(!err && newstatus){
                        status = newstatus;
                        clearDbCallbacks();
                    }
                });
            }
        });
        socket.on('disconnect',function(){
            status = STATUS_NETWORK_DISCONNECTED;
            clearDbCallbacks();
            clearCallbacks();
        });

        function closeDatabase (callback) {
            var guid = GUID();
            callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
            socket.emit('closeDatabase',dbId,function(err){
                if(callbacks[guid]){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
                }
            });
        }

        function fsyncDatabase (callback) {
            var guid = GUID();
            callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
            socket.emit('fsyncDatabase',dbId,function(err){
                if(callbacks[guid]){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
                }
            });
        }

        function getDatabaseStatus (oldstatus,callback) {
            if(status !== oldstatus){
                callback(null,status);
            } else {
                var guid = GUID();
                getDbStatusCallbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('getDatabaseStatus',dbId,oldstatus,function(err,newstatus){
                    if(!err && newstatus){
                        status = newstatus;
                    }
                    if(callbacks[guid]){
                        clearTimeout(getDbStatusCallbacks[guid].to);
                        delete getDbStatusCallbacks[guid];
                        callback(err,newstatus);
                    }
                });
            }
        }

        function getProjectNames (callback) {
            var guid = GUID();
            callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
            socket.emit('getProjectNames',dbId,function(err,names){
                if(callbacks[guid]){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err,names);
                }
            });
        }

        function deleteProject (project, callback) {
            var guid = GUID();
            callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
            socket.emit('deleteProject',dbId,project,function(err){
                if(callbacks[guid]){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
                }
            });
        }

        function openProject (project, callback) {
            var projId = null;
            var guid = GUID();
            callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
            socket.emit('openProject',dbId,project,function(err,proj){
                if(callbacks[guid]){
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    if(!err && proj){
                        projId = proj;
                        callback(null, {
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
                        });
                    } else {
                        callback(err,null);
                    }
                }
            });

            function fsyncDatabase(callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('fsyncDatabase',projId,project,function(err){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            }

            function getDatabaseStatus(callback){
                //TODO failsafe layer how to add
                if(status !== oldstatus){
                    callback(null,status);
                } else {
                    var guid = GUID();
                    getDbStatusCallbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('getDatabaseStatus',projId,oldstatus,function(err,newstatus){
                        if(!err && newstatus){
                            status = newstatus;
                        }
                        if(callbacks[guid]){
                            clearTimeout(getDbStatusCallbacks[guid].to);
                            delete getDbStatusCallbacks[guid];
                            callback(err,newstatus);
                        }
                    });
                }
            }

            function closeProject(callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('closeProject',projId,function(err){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            }

            function loadObject(hash,callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('loadObject',projId,hash,function(err,object){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,object);
                    }
                });
            }

            function insertObject(object,callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('insertObject',projId,object,function(err){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            }

            function findHash(beginning,callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('findHash',projId,beginning,function(err,hash){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,hash);
                    }
                });
            }

            function dumpObjects(callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('dumpObjects',projId,function(err){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            }

            function getBranchNames(callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('getBranchNames',projId,function(err,names){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,names);
                    }
                });
            }

            function getBranchHash(branch,oldhash,callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('getBranchHash',projId,branch,oldhash,function(err,newhash){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,newhash);
                    }
                });
            }

            function setBranchHash(branch,oldhash,newhash,callback){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('setBranchHash',projId,branch,oldhash,newhash,function(err){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            }
        }
    }
    return openDatabase;
});
