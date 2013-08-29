/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", "util/guid" ], function (ASSERT, GUID) {
    "use strict";

    var HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$");

    function Database (options) {
        ASSERT(typeof options === "object");

        options.host = options.host || "http://localhost";
        options.port = options.port || 80;
        options.type = options.type || "browser";
        options.timeout = options.timeout || 10000;

        if (options.host.substr(0, 7) !== "http://" && options.host.substr(0, 8) !== "https://") {
            options.host = "http://" + options.host;
        }

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
                    socket = IO.connect(options.host + ":" + options.port, {
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
                    require([ options.host + ":" + options.port + "/socket.io/socket.io.js" ], function () {
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
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
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
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
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
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err, names);
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
                    clearTimeout(callbacks[guid].to);
                    delete callbacks[guid];
                    callback(err);
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function authenticate (username,callback){
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit("authenticate",username,function(err,codedSession){
                    if (!err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(null,codedSession);
                        }
                    } else {
                        callback(err,null);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function openProject () {
            ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
            var callback = arguments[arguments.length-1];
            var project = arguments[0];
            var iArgs = [];
            for(var i=0;i<arguments.length;i++){
                iArgs.push(arguments[i]);
            }
            iArgs.unshift('openProject');
            var iCallBack = function (err) {
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
            };
            iArgs.splice(iArgs.length-1,1,iCallBack);
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
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            //functions

            function fsyncDatabase () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('fsyncDatabase');
                var iCallBack = function (err) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                };
                iArgs.push(iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getDatabaseStatus () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('getDatabaseStatus');
                var iCallBack = function (err, newstatus) {
                    if (getDbStatusCallbacks[guid]) {
                        clearTimeout(getDbStatusCallbacks[guid].to);
                        delete getDbStatusCallbacks[guid];
                        if (!err && newstatus) {
                            status = newstatus;
                        }
                        callback(err, newstatus);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                var oldstatus = arguments[0];
                if (status !== oldstatus) {
                    callback(null, status);
                } else {
                    var guid = GUID();
                    getDbStatusCallbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    if (socketConnected) {
                        socket.emit.apply(socket,iArgs);
                    }
                }
            }

            function closeProject () {
                var callback = function(){};
                if(typeof arguments[arguments.length-1] === 'function'){
                    callback = arguments[arguments.length-1];
                }
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('closeProject');
                var iCallBack = function (err) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (unRegisterProject(ownId, project)) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(null);
                }
            }

            function loadObject () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('loadObject');
                var iCallBack = function (err, object) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, object);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function insertObject () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('insertObject');
                var iCallBack = function (err) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function findHash () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('findHash');
                var iCallBack = function (err) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function dumpObjects () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('dumpObjects');
                var iCallBack = function (err) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getBranchNames () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('getBranchNames');
                var iCallBack = function (err, names) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, names);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getBranchHash () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('getBranchHash');
                var iCallBack = function (err, newhash, forkedhash) {
                    if (getBranchHashCallbacks[guid]) {
                        clearTimeout(getBranchHashCallbacks[guid].to);
                        delete getBranchHashCallbacks[guid];
                        callback(err, newhash, forkedhash);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                var branch = arguments[0];
                var oldhash = arguments[1];
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
                    socket.emit.apply(socket,iArgs);
                }

            }

            function setBranchHash () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('setBranchHash');
                var iCallBack = function (err) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                var branch = arguments[0];
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getCommits () {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('setBranchHash');
                var iCallBack = function (err, commits) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, commits);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function makeCommit (parents, roothash, msg, callback) {
                ASSERT(arguments && typeof arguments[arguments.length-1] === 'function'); //callback check
                var callback = arguments[arguments.length-1];
                var iArgs = [];
                for(var i=0;i<arguments.length;i++){
                    iArgs.push(arguments[i]);
                }
                iArgs.unshift(project);
                iArgs.unshift('makeCommit');
                var iCallBack = function (err) {
                    if (callbacks[guid]) {
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                };
                iArgs.splice(iArgs.length-1,1,iCallBack);
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit.apply(socket,iArgs);
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }
        }

        return {
            openDatabase: openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getDatabaseStatus: getDatabaseStatus,
            getProjectNames: getProjectNames,
            deleteProject: deleteProject,
            openProject: openProject,
            authenticate: authenticate
        };
    }
    return Database;
});

