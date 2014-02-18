/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/guid" ], function (ASSERT, GUID) {
    "use strict";

    function Database (options) {
        ASSERT(typeof options === "object");

        options.type = options.type || "browser";
        options.timeout = options.timeout || 10000;

        var _hostAddress = window.location.protocol + '//' + window.location.host;


        var socketConnected = false, socket = null, status = null, reconnect = false, getDbStatusCallbacks = {}, callbacks = {}, getBranchHashCallbacks = {}, IO = null, projects = {}, references = {}, ERROR_DISCONNECTED =
            'The socket.io is disconnected', ERROR_TIMEOUT = "no valid response arrived in time", STATUS_NETWORK_DISCONNECTED = "socket.io is disconnected";

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
                    socket.socket.reconnect();
                }
            } else {
                var guid = GUID(), firstConnection = true;
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };

                var IOReady = function () {
                    socket = IO.connect(_hostAddress,{
                        'connect timeout': 10,
                        'reconnection delay': 1,
                        'force new connection': true,
                        'reconnect': false
                    });

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

                    socket.on('disconnect', function () {
                        status = STATUS_NETWORK_DISCONNECTED;
                        socketConnected = false;
                        clearDbCallbacks();
                        clearCallbacks();
                        //socket.socket.reconnect();
                    });
                };

                if (options.type === 'browser') {
                    require([ _hostAddress + "/socket.io/socket.io.js" ], function () {
                        IO = io;
                        IOReady();
                    });
                } else {
                    /*IO = require("socket.io-client");
                     IOReady();*/
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
                    to: setTimeout(callbackTimeout, options.timeout, guid)
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

        function fsyncDatabase (callback) {
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit('fsyncDatabase', function (err) {
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
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                if (status !== STATUS_NETWORK_DISCONNECTED) {
                    socket.emit('getDatabaseStatus', oldstatus, function (err, newstatus) {
                        if (!err && newstatus) {
                            status = newstatus;
                        }
                        if (callbacks[guid]) {
                            clearTimeout(getDbStatusCallbacks[guid].to);
                            delete getDbStatusCallbacks[guid];
                            commonErrorCheck(err, function (err2, needRedo) {
                                if (needRedo) {
                                    getDatabaseStatus(oldstatus, callback);
                                } else {
                                    callback(err2, newstatus);
                                }
                            });
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
                    to: setTimeout(callbackTimeout, options.timeout, guid)
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
                    to: setTimeout(callbackTimeout, options.timeout, guid)
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
                    to: setTimeout(callbackTimeout, options.timeout, guid)
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
                    to: setTimeout(callbackTimeout, options.timeout, guid)
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
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('openProject', project, function (err) {
                        if (!err) {
                            registerProject(ownId, project);
                            if (callbacks[guid]) {
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
                                    setBranchHash: setBranchHash,
                                    getCommits: getCommits,
                                    makeCommit: makeCommit,
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

            function fsyncDatabase (callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('fsyncDatabase', function (err) {
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

            function getDatabaseStatus (oldstatus, callback) {
                ASSERT(typeof callback === 'function');
                if (status !== oldstatus) {
                    callback(null, status);
                } else {
                    var guid = GUID();
                    getDbStatusCallbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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

            function loadObject (hash, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('loadObject', project, hash, function (err, object) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err, object);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function insertObject (object, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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

            function findHash (beginning, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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
                        to: setTimeout(callbackTimeout, options.timeout, guid),
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
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
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
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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
                        to: setTimeout(callbackTimeout, options.timeout, guid)
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
        }

        function simpleRequest (parameters,callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*options.timeout, guid)
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
                    to: setTimeout(callbackTimeout,100*options.timeout, guid)
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
        function getToken(callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*options.timeout, guid)
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
            getToken: getToken
        };
    }
    return Database;
});

