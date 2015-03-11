/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/guid" ], function (ASSERT, GUID) {
    "use strict";

    function Database (options) {
        var gmeConfig = options.globConf;
        ASSERT(typeof options === "object");

        options.type = options.type || "browser";

        var _hostAddress = null;
        if(options.type === "browser") {
            _hostAddress = options.host || window.location.protocol + '//' + window.location.host;
        } else {
            _hostAddress = options.host + ':' + gmeConfig.server.port;
        }


        var socketConnected = false,
            socket = null,
            status = null,
            reconnect = false,
            getDbStatusCallbacks = {},
            callbacks = {},
            getBranchHashCallbacks = {},
            IO = null,
            projects = {},
            references = {},
            ERROR_DISCONNECTED = 'The socket.io is disconnected',
            ERROR_TIMEOUT = "no valid response arrived in time",
            STATUS_NETWORK_DISCONNECTED = "socket.io is disconnected";

        function clearDbCallbacks () {
            var myCallbacks = [];
            for ( var i in getDbStatusCallbacks) {
                myCallbacks.push(getDbStatusCallbacks[i]);
                clearTimeout(getDbStatusCallbacks[i].to);
            }
            getDbStatusCallbacks = {};
            for (i = 0; i < myCallbacks.length; i++) {
                myCallbacks[i].cb(null, status);
            }
        }

        function clearCallbacks () {
            var myCallbacks = [];
            for ( var i in callbacks) {
                myCallbacks.push(callbacks[i]);
                clearTimeout(callbacks[i].to);
            }
            callbacks = {};
            for (i = 0; i < myCallbacks.length; i++) {
                myCallbacks[i].cb(ERROR_DISCONNECTED);
            }
        }

        function reSendGetBranches () {
            //this function should be called after reconnecting
            for ( var i in getBranchHashCallbacks) {
                projects[getBranchHashCallbacks[i].project].getBranchHash(i, getBranchHashCallbacks[i].oldhash, getBranchHashCallbacks[i].cb);
            }
        }

        function callbackTimeout (guid) {
            var cb = null, oldhash = "";
            if (callbacks[guid]) {
                cb = callbacks[guid].cb;
                delete callbacks[guid];
                cb(new Error(ERROR_TIMEOUT));
            } else if (getDbStatusCallbacks[guid]) {
                cb = getDbStatusCallbacks[guid].cb;
                delete getDbStatusCallbacks[guid];
                cb(null, status);
            } else if (getBranchHashCallbacks[guid]) {
                cb = getBranchHashCallbacks[guid].cb;
                oldhash = getBranchHashCallbacks[guid].oldhash;
                delete getBranchHashCallbacks[guid];
                cb(new Error(ERROR_TIMEOUT), null, null);
            }
        }

        function registerProject (id, name) {
            if (!references[name]) {
                references[name] = [];
            }
            if (references[name].indexOf(id) === -1) {
                references[name].push(id);
            }
        }

        function unRegisterProject (id, name) {
            if (references[name]) {
                var index = references[name].indexOf(id);
                if (index > -1) {
                    references[name].splice(index, 1);
                    if (references[name].length === 0) {
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

        function openDatabase (callback) {
            ASSERT(typeof callback === "function");

            if (socket) {
                if (socketConnected) {
                    callback(null);
                } else {
                    //we should try to reconnect
                    callback(null);
                    //socket.socket.reconnect();
                }
            } else {
                var guid = GUID(), firstConnection = true;
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };

                var IOReady = function () {
                    var socketIoOpts = JSON.parse(JSON.stringify(gmeConfig.socketIO)); // Copy these values.
                    if (options.webGMESessionId) {
                        socketIoOpts.query = 'webGMESessionId=' + options.webGMESessionId; //FIXME this will be undefined in some cases
                    }
                    socket = IO.connect(_hostAddress, socketIoOpts);

                    socket.on('connect', function () {
                        socketConnected = true;
                        if (firstConnection) {
                            firstConnection = false;
                            socket.emit('openDatabase', function (err) {
                                if (!err) {
                                    socket.emit('getDatabaseStatus', null, function (err, newstatus) {
                                        if (!err && newstatus) {
                                            status = newstatus;
                                        }
                                        if (callbacks[guid]) {
                                            clearTimeout(callbacks[guid].to);
                                            delete callbacks[guid];
                                            callback(err);
                                        }
                                    });
                                } else {
                                    socket.emit('disconnect');
                                    socket = null;
                                    if (callbacks[guid]) {
                                        clearTimeout(callbacks[guid].to);
                                        delete callbacks[guid];
                                        callback(err);
                                    }
                                }
                            });
                        } else {
                            socket.emit('getDatabaseStatus', status, function (err, newstatus) {
                                if (!err && newstatus) {
                                    status = newstatus;
                                    clearDbCallbacks();
                                    reSendGetBranches();
                                }
                            });
                        }
                    });

                    socket.on('error', function (err) {
                        callback(err);
                    });

                    socket.on('disconnect', function () {
                        status = STATUS_NETWORK_DISCONNECTED;
                        socketConnected = false;
                        clearDbCallbacks();
                        clearCallbacks();
                        //socket.socket.reconnect();
                    });
                };

                if (options.type === 'browser') {
                    require([ _hostAddress + "/socket.io/socket.io.js" ], function (io) {
                        IO = io || window.io;
                        IOReady();
                    });
                } else {
                    require([ 'socket.io-client' ], function (io) {
                        IO = io;
                        IOReady();
                    });
                }
            }
        }

        function closeDatabase (callback) {
            callback = callback || function () {
            };
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                socket.emit('closeDatabase', function (err) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function fsyncDatabase (callback, projectName) {
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                socket.emit('fsyncDatabase', projectName, function (err) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function getDatabaseStatus (oldstatus, callback) {
            ASSERT(typeof callback === 'function');
            if (status !== oldstatus) {
                callback(null, status);
            } else {
                var guid = GUID();
                getDbStatusCallbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                if (status !== STATUS_NETWORK_DISCONNECTED) {
                    socket.emit('getDatabaseStatus', oldstatus, function (err, newstatus) {
                        if (!err && newstatus) {
                            status = newstatus;
                        }
                        if (callbacks[guid]) {
                            clearTimeout(getDbStatusCallbacks[guid].to);
                            delete getDbStatusCallbacks[guid];
                            callback(err,newstatus);
                            //TODO why this common error check is missing and what was redo meant???
                            /*commonErrorCheck(err, function (err2, needRedo) {
                                if (needRedo) {
                                    getDatabaseStatus(oldstatus, callback);
                                } else {
                                    callback(err2, newstatus);
                                }
                            });*/
                        }
                    });
                }
            }
        }

        function getProjectNames (callback) {
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                socket.emit('getProjectNames', function (err, names) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, names);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function getAllowedProjectNames (callback){
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                socket.emit('getAllowedProjectNames', function (err, names) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, names);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function getAuthorizationInfo (name,callback){
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                socket.emit('getAuthorizationInfo', name, function (err, authInfo) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, authInfo);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function deleteProject (project, callback) {
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                socket.emit('deleteProject', project, function (err) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function getNextServerEvent(latestGuid,callback){
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                };
                socket.emit('getNextServerEvent',latestGuid,function(err,newGuid,eventParams){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,newGuid,eventParams);
                    }
                });
            }
        }
        function openProject (project, callback) {
            ASSERT(typeof callback === 'function');
            var ownId = GUID();
            if (projects[project]) {
                registerProject(ownId, project);
                callback(null, projects[project]);
            } else {
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('openProject', project, function (err) {
                        if (!err) {
                            registerProject(ownId, project);
                            if (callbacks[guid]) {
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                projects[project] = {
                                    fsyncDatabase: fsync,
                                    getDatabaseStatus: getDatabaseStatus,
                                    closeProject: closeProject,
                                    loadObject: loadObject,
                                    insertObject: insertObject,
                                    getInfo: getInfo,
                                    setInfo: setInfo,
                                    findHash: findHash,
                                    dumpObjects: dumpObjects,
                                    getBranchNames: getBranchNames,
                                    getBranchHash: getBranchHash,
                                    setBranchHash: setBranchHash,
                                    getCommits: getCommits,
                                    makeCommit: makeCommit,
                  getCommonAncestorCommit: getCommonAncestorCommit,
                                    ID_NAME: "_id"
                                };
                                callback(null, projects[project]);
                            }
                        } else {
                            callback(err, null);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            //functions
            function fsync(callback){
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    flushSaveBucket();
                    socket.emit('fsyncDatabase', project, function (err) {
                        if(callbacks[guid]){
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getDatabaseStatus (oldstatus, callback) {
                ASSERT(typeof callback === 'function');
                if (status !== oldstatus) {
                    callback(null, status);
                } else {
                    var guid = GUID();
                    getDbStatusCallbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    if (socketConnected) {
                        socket.emit('getDatabaseStatus', oldstatus, function (err, newstatus) {
                            if (getDbStatusCallbacks[guid]) {
                                clearTimeout(getDbStatusCallbacks[guid].to);
                                delete getDbStatusCallbacks[guid];
                                if (!err && newstatus) {
                                    status = newstatus;
                                }
                                callback(err, newstatus);
                            }
                        });
                    }
                }
            }

            function closeProject (callback) {
                callback = callback || function () {
                };
                if (unRegisterProject(ownId, project)) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('closeProject', project, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(null);
                }
            }

            function _loadObject(hash,callback){
                socket.emit('loadObject',project,hash,callback);
            }
            function loadObject (hash, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    if(loadBucketSize === 0){
                        ++loadBucketSize;
                        loadBucket.push({hash:hash,cb:callback});
                        loadBucketTimer = setTimeout(function(){
                            var myBucket = loadBucket;
                            loadBucket = [];
                            loadBucketTimer = null;
                            loadBucketSize = 0;
                            loadObjects(myBucket);
                        },10);
                    } else if (loadBucketSize === 99){
                        loadBucket.push({hash:hash,cb:callback});
                        var myBucket = loadBucket;
                        loadBucket = [];
                        clearTimeout(loadBucketTimer);
                        loadBucketTimer = null;
                        loadBucketSize = 0;
                        loadObjects(myBucket);
                    } else {
                        loadBucket.push({hash:hash,cb:callback});
                        ++loadBucketSize;
                    }
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            var loadBucket = [],
                loadBucketSize = 0,
                loadBucketTimer;
            function loadObjects (hashedObjects){
                var hashes = {},i;
                for(i=0;i<hashedObjects.length;i++){
                    hashes[hashedObjects[i].hash] = true;
                }
                hashes = Object.keys(hashes);
                socket.emit('loadObjects',project,hashes,function(err,results){
                    for(i=0;i<hashedObjects.length;i++){
                        hashedObjects[i].cb(err,results[hashedObjects[i].hash]);
                    }
                });

            }

            function insertObject (object, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    if(saveBucket.length === 0){
                        saveBucket.push({object:object,cb:callback});
                        saveBucketTimer = setTimeout(function(){
                           flushSaveBucket();
                        },10);
                    } else if (saveBucket.length === 99){
                        saveBucket.push({object:object,cb:callback});
                        flushSaveBucket();
                    } else {
                        saveBucket.push({object:object,cb:callback});
                    }
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            var saveBucket = [],
                saveBucketTimer;

            function flushSaveBucket(){
                var myBucket = saveBucket;
                saveBucket = [];
                try{
                    clearTimeout(saveBucketTimer);
                } catch(e){
                    //TODO there is no task to do here
                }
                saveBucketTimer = null;
                if(myBucket.length > 0){
                    insertObjects(myBucket);
                }
            }

            function insertObjects (objects) {
                var storeObjects = [],i;
                for(i=0;i<objects.length;i++){
                    storeObjects.push(objects[i].object);
                }
                socket.emit('insertObjects',project,storeObjects,function(err){
                    for(i=0;i<objects.length;i++){
                        objects[i].cb(err);
                    }
                });
            }
            function _insertObject (object, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('insertObject', project, object, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }
            function getInfo(callback){
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('getInfo', project, function (err,info) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err,info);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }
            function setInfo(info,callback){
                ASSERT(typeof info === 'object' && typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('setInfo', project, info, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function findHash (beginning, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('findHash', project, beginning, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function dumpObjects (callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('dumpObjects', project, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getBranchNames (callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('getBranchNames', project, function (err, names) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err, names);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getBranchHash (branch, oldhash, callback) {
                ASSERT(typeof callback === 'function');
                var guid = GUID();
                if (getBranchHashCallbacks[branch]) {
                    //internal hack for recalling
                    guid = branch;
                    branch = getBranchHashCallbacks[guid].branch;
                } else {
                    getBranchHashCallbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid),
                        branch: branch,
                        oldhash: oldhash,
                        project: project
                    };
                }

                if (socketConnected) {
                    socket.emit('getBranchHash', project, branch, oldhash, function (err, newhash, forkedhash) {
                        if (getBranchHashCallbacks[guid]) {
                            clearTimeout(getBranchHashCallbacks[guid].to);
                            delete getBranchHashCallbacks[guid];
                            callback(err, newhash, forkedhash);
                        }
                    });
                }

            }

            function setBranchHash (branch, oldhash, newhash, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    flushSaveBucket();
                    socket.emit('setBranchHash', project, branch, oldhash, newhash, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getCommits (before, number, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('getCommits', project, before, number, function (err, commits) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err, commits);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function makeCommit (parents, roothash, msg, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
                    };
                    socket.emit('makeCommit', project, parents, roothash, msg, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

      function getCommonAncestorCommit(commitA, commitB, callback) {
        ASSERT(typeof callback === 'function');
        if (socketConnected) {
          var guid = GUID();
          callbacks[guid] = {
            cb: callback,
            to: setTimeout(callbackTimeout, gmeConfig.storage.timeout, guid)
          };
          socket.emit('getCommonAncestorCommit', project, commitA, commitB, function (err, commit) {
            if (callbacks[guid]) {
              clearTimeout(callbacks[guid].to);
              delete callbacks[guid];
              callback(err, commit);
        }
          });
        } else {
          callback(new Error(ERROR_DISCONNECTED));
        }
      }
    }

        function simpleRequest (parameters,callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*gmeConfig.storage.timeout, guid)
                };
                socket.emit('simpleRequest',parameters,function(err,resId){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,resId);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function simpleResult (resultId,callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*gmeConfig.storage.timeout, guid)
                };
                socket.emit('simpleResult',resultId,function(err,result){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,result);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function simpleQuery (workerId,parameters,callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*gmeConfig.storage.timeout, guid)
                };
                socket.emit('simpleQuery',workerId,parameters,function(err,result){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,result);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function getToken(callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*gmeConfig.storage.timeout, guid)
                };
                socket.emit('getToken',function(err,result){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,result);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        return {
            openDatabase: openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getDatabaseStatus: getDatabaseStatus,
            getProjectNames: getProjectNames,
            getAllowedProjectNames: getAllowedProjectNames,
            getAuthorizationInfo: getAuthorizationInfo,
            deleteProject: deleteProject,
            openProject: openProject,
            simpleRequest: simpleRequest,
            simpleResult: simpleResult,
            simpleQuery: simpleQuery,
            getNextServerEvent: getNextServerEvent,
            getToken: getToken
        };
    }
    return Database;
});

/**
 * Created by tkecskes on 5/10/2014.
 */
