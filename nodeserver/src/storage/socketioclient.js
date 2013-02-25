/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert","util/guid"], function (ASSERT,GUID) {
    "use strict";

    function Database(options){
        ASSERT(typeof options === "object");

        options.socketiohost = options.socketiohost || "http://localhost";
        options.socketioport = options.socketioport || 888;
        options.socketioclient = options.socketioclient || "browser";
        options.timeout = options.timeout || 10000;

        var socketConnected = false,
            status = null,
            reconnect = false,
            getDbStatusCallbacks = {},
            callbacks = {},
            ERROR_DISCONNECTED = 'The socket.io is disconnected',
            ERROR_TIMEOUT = "no valid response arrived in time";

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
            var cb = callbacks[guid].cb || getDbStatusCallbacks[guid].cb;
            delete callbacks[guid];
            delete getDbStatusCallbacks[guid];
            cb(ERROR_TIMEOUT);
        }

        function openDatabase(callback){
            ASSERT(typeof callback === "function");



            var dbId = null;
            var status = null;
            var getDbStatusCallbacks = {};
            var callbacks = {};
            var STATUS_NETWORK_DISCONNECTED = "socket.io network is disconnected";
            var ERROR_NETWORK = 'the network is disconnected';
            var ERROR_TIMEOUT = "no valid response arrived in time";
            var ERROR_DEAD_GUID = 'the given object does not exists';
            var myCallback = callback;
            var socket = null;
            var IO = null;
            function IOReady(){
                socket = IO.connect(options.socketiohost+":"+options.socketioport,{
                    'connect timeout': 1000,
                    'reconnection delay': 100
                });
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
                            commonErrorCheck(err,function(err2,needRedo){
                                if(!err && newstatus){
                                    status = newstatus;
                                    clearDbCallbacks();
                                }
                            });
                        });
                    }
                });
                socket.on('disconnect',function(){
                    status = STATUS_NETWORK_DISCONNECTED;
                    clearDbCallbacks();
                    clearCallbacks();
                });
            }

            if(options.socketioclient === 'browser'){
                require([options.socketiohost+":"+options.socketioport+"/socket.io/socket.io.js"], function(){
                    IO = io;
                    IOReady();
                });
            } else {
                IO = require("socket.io-client");
                IOReady();
            }




            function rebuildDatabase(callback){
                dbId = null;
                socket.emit('openDatabase',options,function(err,db){
                    if(!err){
                        dbId = db;
                        callback(null);
                    } else {
                        callback(err);
                    }
                });
            }

            function commonPreCheck(){
                if(status === STATUS_NETWORK_DISCONNECTED){
                    return ERROR_NETWORK;
                }
                return null;
            }

            function commonErrorCheck(err,callback){
                if(err === ERROR_DEAD_GUID){
                    rebuildDatabase(function(err){
                        if(err){
                            callback(err,false);
                        } else {
                            callback(null,true);
                        }
                    });
                } else {
                    callback(err,false);
                }
            }

            function closeDatabase (callback) {
                ASSERT(typeof callback === 'function');
                if(commonPreCheck() === null){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('closeDatabase',dbId,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            commonErrorCheck(err,function(err2,needRedo){
                                if(needRedo){
                                    closeDatabase(callback);
                                } else {
                                    callback(err2);
                                }
                            });
                        }
                    });
                } else {
                    callback(commonPreCheck());
                }
            }

            function fsyncDatabase (callback) {
                ASSERT(typeof callback === 'function');
                if(commonPreCheck() === null){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('fsyncDatabase',dbId,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            commonErrorCheck(err,function(err2,needRedo){
                                if(needRedo){
                                    closeDatabase(callback);
                                } else {
                                    callback(err2);
                                }
                            });
                        }
                    });
                } else {
                    callback(commonPreCheck());
                }
            }

            function getDatabaseStatus (oldstatus,callback) {
                ASSERT(typeof callback === 'function');
                if(status !== oldstatus || status === STATUS_NETWORK_DISCONNECTED){
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
                if(commonPreCheck() === null){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('getProjectNames',dbId,function(err,names){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            commonErrorCheck(err,function(err2,needRedo){
                                if(needRedo){
                                    getProjectNames(callback);
                                } else {
                                    callback(err2,names);
                                }
                            });
                        }
                    });
                } else {
                    callback(commonPreCheck());
                }
            }

            function deleteProject (project, callback) {
                ASSERT(typeof callback === 'function');
                if(commonPreCheck() === null){
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('deleteProject',dbId,project,function(err){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            commonErrorCheck(err,function(err2,needRedo){
                                if(needRedo){
                                    deleteProject(callback);
                                } else {
                                    callback(err2);
                                }
                            });
                        }
                    });
                } else {
                    callback(commonPreCheck());
                }
            }

            function openProject (project, callback) {
                ASSERT(typeof callback === 'function');
                if(commonPreCheck() === null){
                    var projId = null;
                    var guid = GUID();
                    callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                    socket.emit('openProject',dbId,project,function(err,proj){
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            commonErrorCheck(err,function(err2,needRedo){
                                if(needRedo){
                                    openProject(project,callback);

                                } else {
                                    if(!err2 && proj){
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
                                        callback(err2,null);
                                    }
                                }
                            });
                        }
                    });

                } else {
                    callback(commonPreCheck());
                }

                //functions
                function rebuildProject(callback){
                    //after server restart it is possible to re-build the server side connection
                    projId=null;
                    if(dbId){
                        socket.emit('openProject',dbId,project,function(err,proj){
                            if(err){
                                callback(err);
                            } else {
                                projId = proj;
                                callback(null);
                            }
                        });
                    } else {
                        rebuildDatabase(function(err){
                            if(err){
                                callback(err);
                            } else {
                                rebuildProject(callback);
                            }
                        });
                    }
                }

                function commonErrorCheck(err,callback){
                    if(err === ERROR_DEAD_GUID){
                        rebuildProject(function(err){
                            if(err){
                                callback(err,false);
                            } else {
                                callback(null,true);
                            }
                        });
                    } else {
                        callback(err,false);
                    }
                }

                function fsyncDatabase(callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('fsyncDatabase',projId,project,function(err){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        fsyncDatabase(callback);
                                    } else {
                                        callback(err2);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function getDatabaseStatus(oldstatus,callback){
                    ASSERT(typeof callback === 'function');
                    if(status !== oldstatus || status === STATUS_NETWORK_DISCONNECTED){
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

                function closeProject(callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('closeProject',projId,function(err){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        closeProject(callback);
                                    } else {
                                        callback(err2);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function loadObject(hash,callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('loadObject',projId,hash,function(err,object){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        loadObject(hash,callback);
                                    } else {
                                        callback(err2,object);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function insertObject(object,callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        var needRedo = false;
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('insertObject',projId,object,function(err){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        insertObject(object,callback);
                                    } else {
                                        callback(err2);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function findHash(beginning,callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('findHash',projId,beginning,function(err,hash){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        findHash(beginning,callback);
                                    } else {
                                        callback(err2,hash);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function dumpObjects(callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('dumpObjects',projId,function(err){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        dumpObjects(callback);
                                    } else {
                                        callback(err2);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function getBranchNames(callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('getBranchNames',projId,function(err,names){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        getBranchNames(callback);
                                    } else {
                                        callback(err2,names);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function getBranchHash(branch,oldhash,callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('getBranchHash',projId,branch,oldhash,function(err,newhash){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        getBranchHash(branch,oldhash,callback);
                                    } else {
                                        callback(err2,newhash);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
                }

                function setBranchHash(branch,oldhash,newhash,callback){
                    ASSERT(typeof callback === 'function');
                    if(commonPreCheck() === null){
                        var guid = GUID();
                        callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                        socket.emit('setBranchHash',projId,branch,oldhash,newhash,function(err){
                            if(callbacks[guid]){
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                commonErrorCheck(err,function(err2,needRedo){
                                    if(needRedo){
                                        setBranchHash(branch,oldhash,newhash,callback);
                                    } else {
                                        callback(err2);
                                    }
                                });
                            }
                        });
                    } else {
                        callback(commonPreCheck());
                    }
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
            if(commonPreCheck() === null){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('fsyncDatabase',dbId,function(err){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        commonErrorCheck(err,function(err2,needRedo){
                            if(needRedo){
                                closeDatabase(callback);
                            } else {
                                callback(err2);
                            }
                        });
                    }
                });
            } else {
                callback(commonPreCheck());
            }
        }

        function getDatabaseStatus (oldstatus,callback) {
            ASSERT(typeof callback === 'function');
            if(status !== oldstatus || status === STATUS_NETWORK_DISCONNECTED){
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
            if(commonPreCheck() === null){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('getProjectNames',dbId,function(err,names){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        commonErrorCheck(err,function(err2,needRedo){
                            if(needRedo){
                                getProjectNames(callback);
                            } else {
                                callback(err2,names);
                            }
                        });
                    }
                });
            } else {
                callback(commonPreCheck());
            }
        }

        function deleteProject (project, callback) {
            ASSERT(typeof callback === 'function');
            if(commonPreCheck() === null){
                var guid = GUID();
                callbacks[guid] = {cb:callback,to:setTimeout(callbackTimeout,options.timeout,guid)};
                socket.emit('deleteProject',dbId,project,function(err){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        commonErrorCheck(err,function(err2,needRedo){
                            if(needRedo){
                                deleteProject(callback);
                            } else {
                                callback(err2);
                            }
                        });
                    }
                });
            } else {
                callback(commonPreCheck());
            }
        }
    }
    return Database;
});
